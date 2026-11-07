from sqlalchemy.pool import NullPool

import database
from config import Settings, get_settings


def test_cloud_runtime_uses_pooler_without_prepared_statements(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:password@pooler.example:6543/postgres")
    monkeypatch.setenv("DATABASE_POOLING", "null")
    get_settings.cache_clear()
    database.get_engine.cache_clear()
    captured = {}

    def create_engine(url, **kwargs):
        captured.update(url=url, **kwargs)
        return object()

    monkeypatch.setattr(database, "create_engine", create_engine)
    try:
        database.get_engine()
        assert captured["url"].startswith("postgresql+psycopg://")
        assert captured["poolclass"] is NullPool
        assert captured["connect_args"]["prepare_threshold"] is None
        assert "pool_size" not in captured
    finally:
        database.get_engine.cache_clear()
        get_settings.cache_clear()


def test_migrations_can_use_a_separate_session_connection():
    settings = Settings(
        _env_file=None,
        database_url="postgresql://user:password@pooler.example:6543/postgres",
        migration_database_url="postgres://user:password@pooler.example:5432/postgres",
    )
    assert ":6543/" in settings.sqlalchemy_url
    assert ":5432/" in settings.migration_sqlalchemy_url
    assert settings.migration_sqlalchemy_url.startswith("postgresql+psycopg://")
