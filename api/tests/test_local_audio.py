from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import local_audio


def test_local_transcription_returns_text(monkeypatch):
    model = SimpleNamespace(
        transcribe=lambda *a, **k: (
            iter([SimpleNamespace(text=" Hola "), SimpleNamespace(text=" equipo ")]),
            None,
        )
    )
    monkeypatch.setattr(local_audio, "whisper_model", lambda: model)
    assert local_audio.transcribe(b"test audio") == "Hola equipo"


def test_silence_is_not_saved_as_an_answer(monkeypatch):
    model = SimpleNamespace(transcribe=lambda *a, **k: (iter([]), None))
    monkeypatch.setattr(local_audio, "whisper_model", lambda: model)
    with pytest.raises(HTTPException) as error:
        local_audio.transcribe(b"silence")
    assert error.value.status_code == 422
