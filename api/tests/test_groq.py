import json

import httpx
import pytest
from fastapi import HTTPException

from ai import get_ai
from config import get_settings
from groq_provider import GroqProvider, strict_schema
from schemas import Feedback, Question
from test_personalized_plan import plan_data


@pytest.fixture(autouse=True)
def groq_settings(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-key-not-real")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")
    monkeypatch.setenv("GROQ_AUDIO_MODEL", "whisper-large-v3-turbo")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def completion(content, finish="stop"):
    return {"choices": [{"finish_reason": finish, "message": {"content": json.dumps(content)}}]}


QUESTION = {
    "text": "Cuéntame un proyecto en el que hayas colaborado.",
    "skill": "communication",
    "category": "soft_skills",
}


def test_compact_plan_restores_all_interviews_and_activities(monkeypatch):
    expected = plan_data()
    compact = {}
    for key, section in (('a', 'single_question'), ('b', 'five_minutes'), ('c', 'ten_minutes'), ('d', 'fifteen_minutes')):
        compact[key] = {
            f'i{i}': {f'q{j}': {'t': q['text'], 's': q['skill'], 'c': q['category']}
                       for j, q in enumerate(interview['questions'], 1)}
            for i, interview in enumerate(expected[section], 1)
        }
    compact['e'] = {f'i{i}': {'t': a['title'], 'd': a['description'], 'o': a['objective'],
        'w': a['improvement_area'], 's': a['skill'], 'ins': a['instructions'], 'p': a['prompts']}
        for i, a in enumerate(expected['activities'], 1)}
    captured = mock_response(monkeypatch, completion(compact))
    result = GroqProvider().plan({'strengths': ['Aprender'], 'improvement_areas': ['Explicar'], 'preferences': []},
                                 {'title': 'Desarrolladora', 'sector': 'Tecnología'})
    assert [len(getattr(result, name)) for name in ('single_question', 'five_minutes', 'ten_minutes', 'fifteen_minutes', 'activities')] == [3] * 5
    assert [len(group[0].questions) for group in (result.single_question, result.five_minutes, result.ten_minutes, result.fifteen_minutes)] == [1, 3, 5, 7]
    assert captured['json']['max_completion_tokens'] == 3200


def mock_response(monkeypatch, data, status=200, headers=None):
    captured = {}

    def post(_client, url, **kwargs):
        captured.update(url=url, **kwargs)
        return httpx.Response(status, json=data, headers=headers)

    monkeypatch.setattr(httpx.Client, "post", post)
    return captured


def test_question_uses_groq_and_validates_schema(monkeypatch):
    captured = mock_response(monkeypatch, completion(QUESTION))
    assert isinstance(get_ai(), GroqProvider)
    assert get_ai().question({"sector": "Tecnología"}, [], []).text == QUESTION["text"]
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    payload = captured["json"]
    assert payload["model"] == "openai/gpt-oss-120b"
    assert "DATOS" in payload["messages"][1]["content"]
    assert payload["response_format"]["json_schema"]["strict"] is True
    assert "NO CONFIABLES" in payload["messages"][0]["content"]


def test_nested_feedback_schema_closes_all_objects():
    schema = strict_schema(Feedback)
    for node in [schema, *schema["$defs"].values()]:
        if node.get("type") == "object":
            assert node["additionalProperties"] is False
            assert set(node["required"]) == set(node["properties"])
    # Building the transport schema must not mutate Pydantic's validation schema.
    assert Question.model_json_schema()["properties"]["text"]["minLength"] == 5


def test_activity_and_feedback_keep_application_contracts(monkeypatch):
    activity = dict(
        QUESTION, title="Explica tu proyecto", instructions="Responde con un ejemplo concreto."
    )
    mock_response(monkeypatch, completion(activity))
    assert GroqProvider().activity({}, []).title == activity["title"]
    feedback = {
        "summary": "Puedes dar más detalles de tu aportación.",
        "strengths": ["Ejemplo propio"],
        "improvements": [
            {
                "turn_id": "turn-1",
                "suggestion": "Concreta tu contribución.",
                "reformulation": "En mi proyecto me encargué de [aportación].",
            }
        ],
        "recommended_activities": [
            {"skill": "communication", "activity": "Resume tu aportación en tres frases."}
        ],
    }
    mock_response(monkeypatch, completion(feedback))
    assert GroqProvider().feedback({}, [{"id": "turn-1", "answer": "Hice un proyecto"}]).summary
    with pytest.raises(HTTPException) as error:
        GroqProvider().feedback({}, [{"id": "different-turn", "answer": "Hice un proyecto"}])
    assert error.value.status_code == 502


@pytest.mark.parametrize(
    "content,finish", [({}, "stop"), (QUESTION, "length"), (dict(QUESTION, text="x"), "stop")]
)
def test_incomplete_or_invalid_generation_is_not_saved(monkeypatch, content, finish):
    mock_response(monkeypatch, completion(content, finish))
    with pytest.raises(HTTPException) as error:
        GroqProvider().question({}, [], [])
    assert error.value.status_code == 502


@pytest.mark.parametrize(
    "mime,extension",
    [("audio/mp4", "m4a"), ("audio/webm;codecs=opus", "webm"), ("audio/wav", "wav")],
)
def test_transcription_preserves_upload_and_spanish(monkeypatch, mime, extension):
    captured = mock_response(monkeypatch, {"text": "  Mi respuesta en español.  "})
    assert GroqProvider().transcribe(b"original-audio", mime) == "Mi respuesta en español."
    assert captured["url"].endswith("/audio/transcriptions")
    assert captured["files"]["file"][:2] == ("respuesta." + extension, b"original-audio")
    assert captured["data"]["language"] == "es"
    assert captured["data"]["model"] == "whisper-large-v3-turbo"


@pytest.mark.parametrize("text,status", [(" ", 422), ("a" * 6001, 422), (None, 502)])
def test_invalid_transcription_is_visible(monkeypatch, text, status):
    mock_response(monkeypatch, {"text": text})
    with pytest.raises(HTTPException) as error:
        GroqProvider().transcribe(b"audio", "audio/wav")
    assert error.value.status_code == status


@pytest.mark.parametrize(
    "upstream,expected", [(429, 429), (401, 503), (403, 503), (400, 502), (500, 502)]
)
def test_upstream_errors_do_not_expose_private_details(monkeypatch, upstream, expected):
    mock_response(monkeypatch, {"error": "private-account-info"}, upstream, {"retry-after": "12"})
    with pytest.raises(HTTPException) as error:
        GroqProvider().question({}, [], [])
    assert error.value.status_code == expected
    assert "private" not in error.value.detail
    if upstream == 429:
        assert error.value.headers["Retry-After"] == "12"


@pytest.mark.parametrize(
    "exc,status", [(httpx.ReadTimeout("timeout"), 504), (httpx.ConnectError("offline"), 502)]
)
def test_network_errors_are_actionable(monkeypatch, exc, status):
    def fail(*args, **kwargs):
        raise exc

    monkeypatch.setattr(httpx.Client, "post", fail)
    with pytest.raises(HTTPException) as error:
        GroqProvider().question({}, [], [])
    assert error.value.status_code == status


def test_missing_key_fails_before_any_external_request(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "")
    get_settings.cache_clear()

    def unexpected(*args, **kwargs):
        pytest.fail("No network call should happen without a key")

    monkeypatch.setattr(httpx.Client, "post", unexpected)
    with pytest.raises(HTTPException) as error:
        GroqProvider().question({}, [], [])
    assert error.value.status_code == 503 and "GROQ_API_KEY" in error.value.detail


def test_groq_capabilities_and_device_speech(client, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "")
    get_settings.cache_clear()
    result = client.get("/capabilities").json()
    assert result["ai_provider"] == "groq"
    assert result["speech_transport"] == "device"
    assert result["ai_configured"] is False
    assert "test-key" not in json.dumps(result)
    with pytest.raises(HTTPException) as error:
        GroqProvider().speech("Pregunta de ejemplo")
    assert error.value.status_code == 409
