from main import app, get_dictation_provider


def test_dictation_does_not_need_an_interview(client):
    app.dependency_overrides[get_dictation_provider] = lambda: client.fake_ai
    result = client.post("/dictation/transcriptions", files={"file": ("voice.webm", b"audio", "audio/webm")})
    assert result.status_code == 200
    assert result.json()["transcript"] == "Esta es mi respuesta transcrita."
    assert result.json()["saved"] is False
    assert client.post("/dictation/transcriptions", files={"file": ("bad.txt", b"audio", "text/plain")}).status_code == 415
    assert client.post("/dictation/transcriptions", files={"file": ("empty.webm", b"", "audio/webm")}).status_code == 422
