from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select

from config import get_settings
from models import Activity, Interview, Profile


def today():
    return datetime.now(ZoneInfo(get_settings().app_timezone)).date()


def profile_or_404(db):
    profile = db.get(Profile, db.info["user_id"])
    if not profile:
        raise HTTPException(409, "Completa primero el onboarding mediante PUT /profile.")
    return profile


def interview_or_404(db, interview_id):
    interview = db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(404, "Entrevista no encontrada.")
    return interview


def activity_or_404(db, activity_id):
    activity = db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Actividad no encontrada.")
    return activity


def ai_profile(profile):
    # Age is kept in the profile, but is not needed for question generation.
    return {k: v for k, v in profile.data.items() if k not in {"age", "onboarding_document"}}


def personalization(db):
    """Read bounded source records; deleting an interview removes its influence immediately."""
    interviews = db.scalars(
        select(Interview)
        .where(Interview.status == "completed")
        .order_by(Interview.created_at.desc())
        .limit(3)
    ).all()
    activities = db.scalars(
        select(Activity)
        .where(Activity.completed_at.is_not(None))
        .order_by(Activity.completed_at.desc())
        .limit(3)
    ).all()
    return [x.feedback for x in [*interviews, *activities] if x.feedback]


def turn_view(turn):
    return {
        "id": turn.id,
        "position": turn.position,
        "question": turn.question,
        "answer": turn.answer,
        "answered_at": turn.answered_at,
    }


def interview_view(item):
    answered = sum(t.answer is not None for t in item.turns)
    current = (
        next((t for t in item.turns if t.answer is None), None) if item.status == "active" else None
    )
    return {
        "id": item.id,
        "status": item.status,
        "duration_minutes": item.duration_minutes,
        "max_questions": item.max_questions,
        "answered_questions": answered,
        "ready_to_finish": item.status == "active" and current is None,
        "current_turn": turn_view(current) if current else None,
        "turns": [turn_view(t) for t in item.turns],
        "feedback": item.feedback,
        "created_at": item.created_at,
        "finished_at": item.finished_at,
        "profile_snapshot": item.profile_snapshot,
        "disclaimer": "Práctica con IA. Las sugerencias pueden contener errores y no son una evaluación profesional.",
    }


def activity_view(item):
    return {
        "id": item.id,
        "date": item.day,
        **item.content,
        "answer": item.answer,
        "feedback": item.feedback,
        "completed_at": item.completed_at,
        "source": "ai",
    }
