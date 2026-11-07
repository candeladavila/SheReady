import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai import get_ai  # noqa: E402
from auth import user_scope  # noqa: E402
from config import get_settings  # noqa: E402
from database import Base, get_db  # noqa: E402
from main import app  # noqa: E402
from schemas import Feedback, GeneratedActivity, Question  # noqa: E402


class FakeAI:
    """Only injected in tests; never available as an application mode."""

    def __init__(self):
        self.memories = []

    def activity(self, profile, memory):
        self.memories.append(memory)
        return GeneratedActivity(
            text="¿Cómo explicarías tu proyecto?",
            skill="communication",
            category="soft_skills",
            title="Cuenta tu experiencia",
            instructions="Escribe una respuesta breve.",
        )

    def question(self, profile, turns, memory):
        self.memories.append(memory)
        return Question(
            text=f"Pregunta de prueba número {len(turns) + 1}: ¿qué has aprendido?",
            skill="communication",
            category="soft_skills",
        )

    def feedback(self, profile, turns):
        return Feedback(
            summary="Has dado un primer paso para explicar tu experiencia.",
            strengths=["Has descrito una experiencia propia."],
            improvements=[
                {
                    "turn_id": turns[0]["id"],
                    "suggestion": "Añade un ejemplo concreto.",
                    "reformulation": "En mi proyecto participé en [explica tu aportación].",
                }
            ],
            recommended_activities=[
                {"skill": "communication", "activity": "Describe un proyecto en tres frases."}
            ],
        )

    def transcribe(self, audio, mime):
        return "Esta es mi respuesta transcrita."

    def speech(self, text):
        return b"RIFF-test-wave"


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Optional URL must point to a DISPOSABLE PostgreSQL test database.
    url = os.environ.get("TEST_DATABASE_URL", "sqlite:///" + str(tmp_path / "test.db"))
    engine = create_engine(
        url, **({"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {})
    )
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def fk(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def session():
        with factory() as db:
            db.info["user_id"] = "demo"
            yield db

    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "")
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    get_settings.cache_clear()
    fake = FakeAI()
    app.dependency_overrides[user_scope] = lambda: None
    app.dependency_overrides[get_db] = session
    app.dependency_overrides[get_ai] = lambda: fake
    with TestClient(app) as c:
        c.fake_ai = fake
        c.db_factory = factory
        yield c
    app.dependency_overrides.clear()
    get_settings.cache_clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def profile():
    return {
        "age": 25,
        "sector": "Tecnología",
        "target_role": "Desarrolladora backend",
        "experience_years": 1.5,
        "daily_minutes": 5,
        "strengths": ["Trabajo en equipo"],
        "improvement_areas": ["Comunicación"],
        "interview_in_days": 7,
    }
