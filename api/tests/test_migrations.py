from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from config import get_settings
from database import Base


def test_migration_roundtrip_and_schema_matches_models(tmp_path, monkeypatch):
    url = "sqlite:///" + str(tmp_path / "migration.db")
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    engine = create_engine(url)
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
    command.downgrade(config, "base")
    assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
    engine.dispose()
    get_settings.cache_clear()


def test_profile_columns_are_backfilled_from_existing_document(tmp_path, monkeypatch):
    import json

    from sqlalchemy import text

    url = "sqlite:///" + str(tmp_path / "backfill.db")
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "20261107_cycles")
    engine = create_engine(url)
    document = {"goals": ["Preparar entrevistas"], "age_range": "25–34 años", "daily_time_choice": "5 minutos", "sector": "Tecnología"}
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO profiles (id, data, created_at, updated_at) VALUES (:id, :data, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"), {"id": "test", "data": json.dumps({"onboarding_document": document, "sector": "Tecnología"})})
    command.upgrade(config, "head")
    with engine.connect() as connection:
        row = connection.execute(text("SELECT goals, age_range, daily_time_choice, sector FROM profiles WHERE id = 'test'" )).one()
        assert json.loads(row.goals) == document["goals"]
        assert (row.age_range, row.daily_time_choice, row.sector) == (document["age_range"], document["daily_time_choice"], document["sector"])
    engine.dispose()
    get_settings.cache_clear()
