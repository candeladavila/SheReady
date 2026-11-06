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
