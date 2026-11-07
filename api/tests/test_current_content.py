import json
from datetime import datetime, timedelta, timezone

import current_content as content
from config import get_settings


def test_event_normalization_relevance_and_date():
    future = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S.0")
    row = {"id": "1", "title": "Mujeres en tecnología", "description": "<b>Empleo</b>", "dtstart": future, "link": "https://example.org/event", "organization": {}, "address": {}, "location": {}}
    result = content.event(row, "Madrid")
    assert "Tecnología" in result["sectors"]
    assert result["description"] == "Empleo" and result["url"] == row["link"]
    assert content.event({**row, "title": "Taller infantil", "description": "Pintura"}, "Madrid") is None
    assert content.event({**row, "link": "javascript:alert(1)"}, "Madrid") is None
    assert content.event({**row, "dtstart": "2000-01-01 12:00:00.0"}, "Madrid") is None


def test_news_disabled_and_deduplicated(monkeypatch):
    monkeypatch.setenv("ENABLE_GNEWS", "false")
    get_settings.cache_clear()
    assert content.load_news("Tecnología")["status"] == "curated"
    monkeypatch.setenv("CONTENT_ENVIRONMENT", "development")
    monkeypatch.setenv("ENABLE_GNEWS", "true")
    monkeypatch.setenv("GNEWS_API_KEY", "test")
    get_settings.cache_clear()
    article = {"title": "Women lead engineering", "description": "Women in technology", "url": "https://example.org/a#fragment", "publishedAt": "2026-11-01T12:00:00Z", "source": {"name": "Example"}}
    monkeypatch.setattr(content, "fetch", lambda _: json.dumps({"articles": [article, article, {**article, "title": "Other", "description": "Generic"}]}).encode())
    result = content.load_news("Tecnología")
    assert len(result["items"]) == 1 and result["items"][0]["url"] == "https://example.org/a"
    monkeypatch.setenv("CONTENT_ENVIRONMENT", "production")
    get_settings.cache_clear()
    assert content.load_news("Tecnología")["status"] == "curated"
    get_settings.cache_clear()


def test_cache_handles_provider_failure(monkeypatch):
    content._cache.clear()
    def fail():
        raise OSError("network")
    assert content.cached("broken", fail)["status"] == "error"
    content._cache["old"] = (0, {"items": [{"id": "a"}], "status": "ok", "updated_at": "old"})
    assert content.cached("old", fail)["status"] == "stale"
    content._cache.clear()


