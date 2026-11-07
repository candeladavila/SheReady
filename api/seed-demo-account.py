"""Create a demo login without replacing the existing demo profile or history."""

import argparse
import secrets
from datetime import timedelta
from pathlib import Path

from dotenv import dotenv_values, set_key
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from auth import hasher
from config import get_settings
from models import Profile, User
from services import today

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--production", action="store_true")
    args = parser.parse_args()
    credentials = Path(".env.demo.local")
    if not credentials.exists():
        credentials.touch()
        set_key(str(credentials), "DEMO_EMAIL", "demo@sheready.example.com")
        set_key(str(credentials), "DEMO_PASSWORD", secrets.token_urlsafe(24))
    values = dotenv_values(credentials)
    url = (
        dotenv_values(".env.production.local")["MIGRATION_DATABASE_URL"]
        if args.production
        else get_settings().sqlalchemy_url
    )
    engine = create_engine(url)
    with Session(engine) as db:
        user = db.get(User, "demo")
        if not user:
            db.add(
                User(
                    id="demo",
                    email=values["DEMO_EMAIL"],
                    password_hash=hasher.hash(values["DEMO_PASSWORD"]),
                )
            )
        elif user.email != values["DEMO_EMAIL"]:
            raise RuntimeError("La cuenta demo ya pertenece a otro correo; no se modifica.")
        if not db.get(Profile, "demo"):
            db.add(
                Profile(
                    id="demo",
                    data={
                        "age": 25,
                        "sector": "Tecnología",
                        "target_role": "Desarrolladora backend junior (perfil ficticio de demo)",
                        "experience_years": 1,
                        "daily_minutes": 5,
                        "strengths": ["Trabajo en equipo", "Aprendizaje continuo"],
                        "improvement_areas": ["Comunicación de logros", "Preguntas técnicas"],
                        "interview_date": (today() + timedelta(days=14)).isoformat(),
                    },
                )
            )
        db.commit()
    engine.dispose()
    print(
        "Cuenta demo preparada. Credenciales en api/.env.demo.local; perfil e historial existentes conservados."
    )
