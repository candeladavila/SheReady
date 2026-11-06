import io
import wave
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from google.genai import errors

from ai import GeminiProvider
from config import get_settings
from schemas import Question


def inject(monkeypatch, response=None, error=None):
    monkeypatch.setenv("GEMINI_API_KEY", "test-only-never-real")
    get_settings.cache_clear()
    captured = {}

    def generate_content(**kwargs):
        captured.update(kwargs)
        if error:
            raise error
        return response

    class Client:
        def __init__(self, **kwargs):
            self.models = SimpleNamespace(generate_content=generate_content)

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

    monkeypatch.setattr("ai.genai.Client", Client)
    return captured


def test_structured_response_and_untrusted_data(monkeypatch):
    captured = inject(
        monkeypatch,
        SimpleNamespace(
            text='{"text":"Describe un proyecto.","skill":"communication","category":"soft_skills"}'
        ),
    )
    result = GeminiProvider().question({"target_role": "Desarrolladora"}, [], [])
    assert isinstance(result, Question)
    assert "DATOS" in captured["contents"]
    assert captured["config"].response_schema is Question
    get_settings.cache_clear()


def test_malformed_response_is_upstream_error(monkeypatch):
    inject(monkeypatch, SimpleNamespace(text="no es JSON"))
    with pytest.raises(HTTPException) as error:
        GeminiProvider().question({}, [], [])
    assert error.value.status_code == 502
    get_settings.cache_clear()


def test_quota_error_is_not_hidden(monkeypatch):
    inject(
        monkeypatch,
        error=errors.ClientError(429, {"error": {"message": "private upstream message"}}),
    )
    with pytest.raises(HTTPException) as error:
        GeminiProvider().question({}, [], [])
    assert error.value.status_code == 429
    assert "private" not in error.value.detail
    get_settings.cache_clear()


def test_pcm_becomes_playable_wav(monkeypatch):
    part = SimpleNamespace(
        inline_data=SimpleNamespace(
            data=b"\x00\x01" * 200, mime_type="audio/L16;codec=pcm;rate=24000"
        )
    )
    response = SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]))])
    inject(monkeypatch, response)
    wav_bytes = GeminiProvider().speech("Hola, cuéntame tu experiencia.")
    with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
        assert wav.getframerate() == 24000
        assert wav.getnchannels() == 1 and wav.getnframes() == 200
    get_settings.cache_clear()


def test_transcription_uses_inline_audio_and_does_not_upload_file(monkeypatch):
    captured = inject(monkeypatch, SimpleNamespace(text="He trabajado en equipo."))
    assert GeminiProvider().transcribe(b"audio", "audio/webm") == "He trabajado en equipo."
    part = captured["contents"][1]
    assert part.inline_data.data == b"audio" and part.inline_data.mime_type == "audio/webm"
    get_settings.cache_clear()


def test_feedback_rejects_unknown_turn_reference(monkeypatch):
    response = SimpleNamespace(
        text='{"summary":"Una devolución de prueba.","strengths":["Ejemplo"],"improvements":[{"turn_id":"inventado","suggestion":"Añade un ejemplo.","reformulation":"En el proyecto hice [acción]."}],"recommended_activities":[{"skill":"communication","activity":"Explica un proyecto."}]}'
    )
    inject(monkeypatch, response)
    with pytest.raises(HTTPException) as error:
        GeminiProvider().feedback({}, [{"id": "real", "answer": "Ejemplo"}])
    assert error.value.status_code == 502
    get_settings.cache_clear()
