"""Authenticated initial context and idempotent per-role plan generation."""
import hashlib
import json
from datetime import timedelta
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ai import get_ai
from auth import user_scope
from database import get_db
from models import InitialProfile, Profile, RolePlan, now
from schemas import InitialInterviewInput, InitialProfileContext, PersonalizedPlan, PlanningRole

router = APIRouter(dependencies=[Depends(user_scope)])
DB = Annotated[Session, Depends(get_db)]
AI = Annotated[object, Depends(get_ai)]


def view(item):
    return {'id': item.id, 'role': item.role, 'status': item.status, 'plan': item.plan}


@router.get('/profile/initial-interview', tags=['personalization'])
def get_initial(db: DB):
    item = db.get(InitialProfile, db.info['user_id'])
    return {'completed': bool(item), 'answers': item.answers if item else None,
            'context': item.context if item else None}


@router.put('/profile/initial-interview', tags=['personalization'])
def save_initial(body: InitialInterviewInput, db: DB, ai: AI):
    user_id = db.info['user_id']
    item = db.get(InitialProfile, user_id)
    if item and item.answers == body.answers:
        return {'completed': True, 'answers': item.answers, 'context': item.context}
    profile = db.get(Profile, user_id)
    onboarding = profile.data.get('onboarding_document', {}) if profile else {}
    context = InitialProfileContext.model_validate(ai.initial_profile(body.answers, onboarding)).model_dump(mode='json')
    if item:
        item.answers, item.context, item.updated_at = body.answers, context, now()
    else:
        db.add(InitialProfile(user_id=user_id, answers=body.answers, context=context))
    if profile:
        profile.data = {**profile.data, 'strengths': context['strengths'], 'improvement_areas': context['improvement_areas']}
    else:
        db.add(Profile(id=user_id, data={'age': None, 'sector': None, 'target_role': None,
            'experience_years': None, 'daily_minutes': None, 'interview_date': None,
            'strengths': context['strengths'], 'improvement_areas': context['improvement_areas']}))
    db.commit()
    return {'completed': True, 'answers': body.answers, 'context': context}


def role_key(role):
    identity = [role.title, role.sector, role.company, role.offer_url]
    value = json.dumps([part.strip().casefold() for part in identity], ensure_ascii=False)
    return hashlib.sha256(value.encode()).hexdigest()


@router.get('/role-plans', tags=['personalization'])
def list_plans(db: DB):
    items = db.scalars(select(RolePlan).where(RolePlan.user_id == db.info['user_id'])
                       .order_by(RolePlan.created_at.desc())).all()
    return {'items': [view(item) for item in items]}


@router.post('/role-plans', tags=['personalization'])
def generate_plan(body: PlanningRole, db: DB, ai: AI):
    user_id = db.info['user_id']
    initial = db.get(InitialProfile, user_id)
    if not initial:
        raise HTTPException(409, 'Completa primero la entrevista inicial.')
    key = role_key(body)
    item = db.scalar(select(RolePlan).where(RolePlan.user_id == user_id, RolePlan.role_key == key))
    if item and item.status == 'ready':
        return view(item)
    generation_id = str(uuid4())
    if not item:
        item = RolePlan(user_id=user_id, role_key=key, role=body.model_dump(mode='json'),
                        status='generating', generation_id=generation_id, updated_at=now())
        db.add(item)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'El plan ya se está preparando. Inténtalo de nuevo.') from None
    else:
        claimed = db.execute(update(RolePlan).where(
            RolePlan.id == item.id, RolePlan.user_id == user_id,
            or_(RolePlan.status == 'failed',
                (RolePlan.status == 'generating') & (RolePlan.updated_at < now() - timedelta(minutes=10)))
        ).values(status='generating', generation_id=generation_id, updated_at=now(), role=body.model_dump(mode='json')).execution_options(synchronize_session=False))
        db.commit()
        if not claimed.rowcount:
            raise HTTPException(409, 'El plan ya se está preparando. Inténtalo de nuevo.')
        db.refresh(item)
    try:
        context = {**initial.context, 'initial_answers': initial.answers}
        plan = PersonalizedPlan.model_validate(ai.plan(context, body.model_dump(mode='json')))
        updated = db.execute(update(RolePlan).where(RolePlan.id == item.id, RolePlan.user_id == user_id,
            RolePlan.generation_id == generation_id, RolePlan.status == 'generating')
            .values(plan=plan.model_dump(mode='json'), status='ready', updated_at=now()))
        if not updated.rowcount:
            raise HTTPException(409, 'El plan está siendo preparado por otro intento.')
        db.commit()
        db.refresh(item)
    except Exception as exc:
        db.rollback()
        db.execute(update(RolePlan).where(RolePlan.id == item.id, RolePlan.user_id == user_id,
                   RolePlan.generation_id == generation_id, RolePlan.status == 'generating')
                   .values(status='failed', updated_at=now()))
        db.commit()
        if isinstance(exc, ValidationError):
            raise HTTPException(502, 'La IA devolvió un plan inválido. Puedes reintentarlo.') from None
        raise
    return view(item)
