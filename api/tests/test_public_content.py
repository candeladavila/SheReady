from auth import user_scope
from main import app


def test_public_content_does_not_require_a_session(client, monkeypatch):
    app.dependency_overrides.pop(user_scope, None)
    monkeypatch.setattr("main.load_news", lambda sector: {"items": [{"title": "Artículo"}], "status": "ok", "updated_at": None})
    monkeypatch.setattr("main.load_events", lambda city: {"items": [], "status": "ok", "updated_at": None})
    from current_content import _cache
    _cache.clear()
    assert client.get("/news?sector=Tecnolog%C3%ADa").status_code == 200
    assert client.get("/events?city=Madrid").status_code == 200
    assert client.get("/profile").status_code == 401
    _cache.clear()
