import httpx

from config import get_settings
from ollama_provider import OllamaProvider


def test_ollama_structured_contract(monkeypatch):
    captured = {}

    def post(_self, url, **kwargs):
        captured.update(kwargs["json"])
        return httpx.Response(
            200,
            json={
                "message": {
                    "content": '{"text":"Cuéntame un proyecto.","skill":"communication","category":"soft_skills"}'
                }
            },
        )

    monkeypatch.setattr(httpx.Client, "post", post)
    result = OllamaProvider().question({"target_role": "Desarrolladora"}, [], [])
    assert result.text == "Cuéntame un proyecto."
    assert captured["model"] == "qwen3:4b"
    assert captured["format"]["properties"]["text"]
    assert captured["think"] is False and captured["stream"] is False


def test_local_mode_never_sends_audio_to_gemini(monkeypatch):
    import local_audio

    monkeypatch.setattr(local_audio, "speech", lambda text: b"RIFF-local")
    monkeypatch.setattr(local_audio, "transcribe", lambda audio: "Texto local")
    assert OllamaProvider().speech("hola") == b"RIFF-local"
    assert OllamaProvider().transcribe(b"audio", "audio/wav") == "Texto local"


def test_provider_selection(monkeypatch):
    from ai import get_ai

    monkeypatch.setenv("AI_PROVIDER", "ollama")
    get_settings.cache_clear()
    assert isinstance(get_ai(), OllamaProvider)
    get_settings.cache_clear()
