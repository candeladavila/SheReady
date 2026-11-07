from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from ai import get_ai
from auth import auth_router, user_scope
from config import get_settings
from content import CONTENT, SKILLS
from database import get_db
from middleware import BodyLimitMiddleware
from models import Activity, Interview, InterviewTurn, Profile, WellbeingCompletion, now
from schemas import (
    AnswerInput,
    InterviewInput,
    OnboardingDocument,
    PersonalizedPlan,
    PlanRequest,
    ProfileInput,
    TurnAnswerInput,
)
from services import (
    activity_or_404,
    activity_view,
    ai_profile,
    interview_or_404,
    interview_view,
    personalization,
    profile_or_404,
    today,
    turn_view,
)

app = FastAPI(
    title="SheReady API",
    version="1.0.0",
    description=(
        "Backend con cuentas individuales. IA real mediante un proveedor configurable; contenido editorial de ejemplo. "
        "Los datos de cada cuenta requieren su token de sesión."
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
app.add_middleware(BodyLimitMiddleware)


@app.middleware("http")
async def prevent_private_response_caching(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response

router = APIRouter(dependencies=[Depends(user_scope)])
DB = Annotated[Session, Depends(get_db)]
AI = Annotated[object, Depends(get_ai)]


@app.exception_handler(StaleDataError)
@app.exception_handler(IntegrityError)
async def conflict_handler(_request, _exception):
    return JSONResponse(
        status_code=409,
        content={
            "detail": "La operación ya se procesó o cambió en otra petición. Recupera el estado actual antes de reintentar."
        },
    )


@app.exception_handler(OperationalError)
async def database_handler(_request, _exception):
    return JSONResponse(
        status_code=503,
        content={"detail": "Base de datos no disponible. Comprueba la conexión y las migraciones."},
    )


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


@app.get("/ready", tags=["system"])
def ready(db: DB):
    db.execute(text("SELECT 1"))
    db.execute(select(Profile.id).limit(1))
    return {"status": "ready"}


@router.get("/capabilities", tags=["system"])
def capabilities():
    s = get_settings()
    models = {
        "groq": {"text": s.groq_model, "audio": s.groq_audio_model, "speech": "device-speech-es"},
        "ollama": {
            "text": s.ollama_model,
            "audio": "whisper-base-local",
            "speech": "windows-speech-es",
        },
        "gemini": {
            "text": s.gemini_model,
            "audio": s.gemini_audio_model,
            "speech": s.gemini_tts_model,
        },
    }
    return {
        "demo_shared_profile": False,
        "authentication_required": True,
        "ai_configured": (
            bool(s.groq_api_key.get_secret_value())
            if s.ai_provider == "groq"
            else bool(s.gemini_api_key.get_secret_value())
            if s.ai_provider == "gemini"
            else True
        ),
        "ai_provider": s.ai_provider,
        "models": models[s.ai_provider],
        "speech_transport": "device" if s.ai_provider == "groq" else "server",
        "models_verified": False,
        "content_source": "sample",
        "interview_durations": [3, 5, 10, 15],
        "max_audio_bytes": s.max_audio_bytes,
        "audio_persisted": False,
        "timezone": s.app_timezone,
    }


@router.get("/profile/options", tags=["profile"])
def profile_options():
    return {
        "skills": SKILLS,
        "interview_timeframes": [
            {"label": "Hoy", "days": 0},
            {"label": "En una semana", "days": 7},
            {"label": "En dos semanas", "days": 14},
            {"label": "En un mes", "days": 30},
        ],
        "daily_minutes": [3, 5, 10, 15, 20],
        "strengths_and_improvement_areas_allow_custom_text": True,
    }


def profile_view(profile):
    return {
        "id": profile.id,
        **profile.data,
        "days_until_interview": (
            (date.fromisoformat(profile.data["interview_date"]) - today()).days
            if profile.data.get("interview_date")
            else None
        ),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.get("/profile", tags=["profile"])
def read_profile(db: DB):
    return profile_view(profile_or_404(db))


@router.put("/profile/onboarding", tags=["profile"])
def save_onboarding(body: OnboardingDocument, db: DB):
    item = db.get(Profile, db.info["user_id"])
    data = (
        dict(item.data)
        if item
        else {
            "age": None,
            "target_role": None,
            "experience_years": None,
            "strengths": [],
            "improvement_areas": [],
            "interview_date": None,
            "sector": None,
            "daily_minutes": None,
        }
    )
    data["onboarding_document"] = body.model_dump(mode="json")
    data["goals"] = body.goals
    if body.sector:
        data["sector"] = body.sector
    if body.daily_minutes:
        data["daily_minutes"] = body.daily_minutes
    if item:
        item.data = data
    else:
        item = Profile(id=db.info["user_id"], data=data)
        db.add(item)
    db.commit()
    return profile_view(item)


@router.put("/profile", tags=["profile"])
def save_profile(body: ProfileInput, db: DB):
    target = body.interview_date or today() + timedelta(days=body.interview_in_days)
    data = body.model_dump(mode="json", exclude={"interview_in_days", "interview_date"})
    data["interview_date"] = target.isoformat()
    item = db.get(Profile, db.info["user_id"])
    if item:
        if item.data.get("onboarding_document"):
            data["onboarding_document"] = item.data["onboarding_document"]
        item.data = data
        item.updated_at = now()
    else:
        item = Profile(id=db.info["user_id"], data=data)
        db.add(item)
    db.commit()
    return profile_view(item)


@router.post("/activities/daily", tags=["activities"])
def daily_activity(db: DB, ai: AI):
    profile = profile_or_404(db)
    existing = db.scalar(
        select(Activity).where(Activity.profile_id == profile.id, Activity.day == today())
    )
    if existing:
        return activity_view(existing)
    generated = ai.activity(ai_profile(profile), personalization(db))
    item = Activity(profile_id=profile.id, day=today(), content=generated.model_dump())
    db.add(item)
    db.commit()
    return activity_view(item)


@router.get("/activities", tags=["activities"])
def list_activities(db: DB, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    items = db.scalars(
        select(Activity).order_by(Activity.day.desc()).offset(offset).limit(limit)
    ).all()
    return {
        "items": [activity_view(x) for x in items],
        "total": db.scalar(select(func.count()).select_from(Activity)),
    }


@router.get("/activities/{activity_id}", tags=["activities"])
def read_activity(activity_id: str, db: DB):
    return activity_view(activity_or_404(db, activity_id))


@router.post("/activities/{activity_id}/answer", tags=["activities"])
def answer_activity(activity_id: str, body: AnswerInput, db: DB, ai: AI):
    item = activity_or_404(db, activity_id)
    if item.completed_at:
        if item.answer == body.answer:
            return activity_view(item)
        raise HTTPException(409, "La actividad ya está completada.")
    feedback = ai.feedback(
        ai_profile(profile_or_404(db)),
        [{"id": item.id, "question": item.content, "answer": body.answer}],
    )
    item.answer, item.feedback, item.completed_at = body.answer, feedback.model_dump(), now()
    db.commit()
    return activity_view(item)


@router.post("/plans/generate", response_model=PersonalizedPlan, tags=["planning"])
def generate_personalized_plan(body: PlanRequest, ai: AI):
    """Genera el contrato completo; la persistencia y selección cíclica son posteriores."""
    return ai.plan(body.context.model_dump(), body.target_role.model_dump())


@router.post("/interviews", status_code=201, tags=["interviews"])
def start_interview(body: InterviewInput, db: DB, ai: AI):
    profile = profile_or_404(db)
    snapshot = ai_profile(profile)
    question = ai.question(snapshot, [], personalization(db))
    interview = Interview(
        profile_id=profile.id,
        duration_minutes=body.duration_minutes,
        max_questions={1: 1, 3: 2, 5: 3, 10: 5, 15: 7}[body.duration_minutes],
        profile_snapshot=snapshot,
    )
    interview.turns.append(InterviewTurn(position=1, question=question.model_dump()))
    db.add(interview)
    db.commit()
    return interview_view(interview)


@router.get("/interviews", tags=["interviews"])
def list_interviews(db: DB, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    items = db.scalars(
        select(Interview).order_by(Interview.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return {
        "items": [
            {
                "id": i.id,
                "status": i.status,
                "duration_minutes": i.duration_minutes,
                "created_at": i.created_at,
                "finished_at": i.finished_at,
                "summary": i.feedback["summary"] if i.feedback else None,
            }
            for i in items
        ],
        "total": db.scalar(select(func.count()).select_from(Interview)),
    }


@router.get("/interviews/{interview_id}", tags=["interviews"])
def read_interview(interview_id: str, db: DB):
    return interview_view(interview_or_404(db, interview_id))


@router.post("/interviews/{interview_id}/answers", tags=["interviews"])
def answer_interview(interview_id: str, body: TurnAnswerInput, db: DB, ai: AI):
    item = interview_or_404(db, interview_id)
    turn = next((t for t in item.turns if t.id == body.turn_id), None)
    if not turn:
        raise HTTPException(404, "Turno no encontrado en esta entrevista.")
    if turn.answer is not None:
        if turn.answer == body.answer:
            return interview_view(item)
        raise HTTPException(409, "Este turno ya tiene una respuesta.")
    if item.status != "active":
        raise HTTPException(409, "La entrevista ya está terminada.")
    turn.answer, turn.answered_at = body.answer, now()
    if len(item.turns) < item.max_questions:
        question = ai.question(
            item.profile_snapshot, [turn_view(t) for t in item.turns], personalization(db)
        )
        item.turns.append(
            InterviewTurn(position=len(item.turns) + 1, question=question.model_dump())
        )
    # Parent version protects answers/finish/delete from concurrent writes.
    item.version += 1
    db.commit()
    return interview_view(item)


@router.post("/interviews/{interview_id}/finish", tags=["interviews"])
def finish_interview(interview_id: str, db: DB, ai: AI):
    item = interview_or_404(db, interview_id)
    if item.status == "completed":
        return interview_view(item)
    turns = [turn_view(t) for t in item.turns if t.answer is not None]
    if not turns:
        raise HTTPException(409, "Responde al menos una pregunta antes de terminar.")
    item.feedback = ai.feedback(item.profile_snapshot, turns).model_dump()
    item.status, item.finished_at = "completed", now()
    db.commit()
    return interview_view(item)


@router.delete("/interviews/{interview_id}", status_code=204, tags=["interviews"])
def delete_interview(interview_id: str, db: DB):
    db.delete(interview_or_404(db, interview_id))
    db.commit()
    return Response(status_code=204)


ALLOWED_AUDIO = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "video/webm",
}
MIME_NORMALIZATION = {
    "audio/mp3": "audio/mpeg",
    "audio/x-wav": "audio/wav",
    "audio/m4a": "audio/mp4",
    "audio/x-m4a": "audio/mp4",
    "video/webm": "audio/webm",
}


@router.post("/interviews/{interview_id}/transcriptions", tags=["voice"])
def transcribe_answer(interview_id: str, db: DB, ai: AI, file: Annotated[UploadFile, File()]):
    try:
        item = interview_or_404(db, interview_id)
        if item.status != "active" or not any(t.answer is None for t in item.turns):
            raise HTTPException(409, "No hay una pregunta pendiente en esta entrevista.")
        mime = (file.content_type or "").split(";", 1)[0].strip().lower()
        if mime not in ALLOWED_AUDIO:
            raise HTTPException(415, "Formato de audio no admitido. Usa WAV, MP3, M4A, OGG o WebM.")
        data = file.file.read(get_settings().max_audio_bytes + 1)
        if not data:
            raise HTTPException(422, "El audio está vacío.")
        if len(data) > get_settings().max_audio_bytes:
            raise HTTPException(413, "El audio supera el tamaño permitido.")
        transcript = ai.transcribe(data, MIME_NORMALIZATION.get(mime, mime))
        return {
            "transcript": transcript,
            "saved": False,
            "source": "ai",
            "next_step": "Revisa el texto y envíalo a POST /interviews/{id}/answers.",
        }
    finally:
        file.file.close()


@router.get("/interviews/{interview_id}/turns/{turn_id}/speech", tags=["voice"])
def question_speech(interview_id: str, turn_id: str, db: DB, ai: AI):
    item = interview_or_404(db, interview_id)
    turn = next((t for t in item.turns if t.id == turn_id), None)
    if not turn:
        raise HTTPException(404, "Turno no encontrado.")
    return Response(
        ai.speech(turn.question["text"]),
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/progress", tags=["progress"])
def progress(db: DB):
    activities = db.scalars(select(Activity).where(Activity.completed_at.is_not(None))).all()
    interviews = db.scalars(select(Interview).where(Interview.status == "completed")).all()
    counts = {s["id"]: 0 for s in SKILLS}
    for a in activities:
        counts[a.content["skill"]] += 1
    for i in interviews:
        for t in i.turns:
            if t.answer is not None:
                counts[t.question["skill"]] += 1
    total = len(activities) + len(interviews)
    milestones = [
        {
            "id": "first_activity",
            "label": "Primera actividad",
            "current": len(activities),
            "target": 1,
        },
        {
            "id": "first_interview",
            "label": "Primera entrevista",
            "current": len(interviews),
            "target": 1,
        },
        {
            "id": "five_practices",
            "label": "Cinco prácticas completadas",
            "current": total,
            "target": 5,
        },
    ]
    milestones += [
        {
            "id": "skill_" + s["id"],
            "label": "Tres prácticas: " + s["label"],
            "current": counts[s["id"]],
            "target": 3,
        }
        for s in SKILLS
    ]
    for m in milestones:
        m["achieved"] = m["current"] >= m["target"]
    return {
        "completed_wellbeing": db.scalar(select(func.count()).select_from(WellbeingCompletion)),
        "completed_activities": len(activities),
        "completed_interviews": len(interviews),
        "answered_interview_questions": sum(
            sum(t.answer is not None for t in i.turns) for i in interviews
        ),
        "skills": [{**s, "practices": counts[s["id"]]} for s in SKILLS],
        "milestones": milestones,
        "recommendations": personalization(db),
        "measurement": "Los hitos cuentan prácticas realizadas; no miden capacidad profesional.",
    }


@router.get("/news", tags=["content"])
def news():
    return {"source": "sample", "is_sample": True, "items": CONTENT["news"]}


@router.get("/events", tags=["content"])
def events():
    return {"source": "sample", "is_sample": True, "items": CONTENT["events"]}


@router.get("/wellbeing/activities", tags=["content"])
def wellbeing():
    return {
        "source": "sample",
        "is_sample": True,
        "items": CONTENT["wellbeing"],
        "description": "Apoyo general al bienestar; no es tratamiento terapéutico.",
    }


class WellbeingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=128, pattern=r"^[a-zA-Z0-9_-]+$")
    kind: Literal["breathing", "confidence"]
    duration_seconds: int = Field(ge=0, le=7200)


@router.post("/wellbeing/completions", tags=["wellbeing"])
def complete_wellbeing(body: WellbeingInput, db: DB):
    profile = profile_or_404(db)
    item = db.get(WellbeingCompletion, body.id)
    if item:
        if item.profile_id != profile.id:
            raise HTTPException(404, "Registro no encontrado.")
        if item.kind != body.kind or item.duration_seconds != body.duration_seconds:
            raise HTTPException(409, "El registro ya existe con otros datos.")
    else:
        item = WellbeingCompletion(
            id=body.id,
            profile_id=profile.id,
            kind=body.kind,
            duration_seconds=body.duration_seconds,
        )
        db.add(item)
        db.commit()
    return {"id": item.id, "kind": item.kind, "created_at": item.created_at}


app.include_router(auth_router)
app.include_router(router)
