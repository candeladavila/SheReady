"""Email/password accounts and revocable opaque bearer sessions."""

import hashlib
import secrets
from datetime import timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import AuthSession, Profile, User, now

auth_router = APIRouter(prefix="/auth", tags=["auth"])
hasher = PasswordHash.recommended()
dummy_hash = hasher.hash(secrets.token_urlsafe(32))
bearer = HTTPBearer(auto_error=False)
DB = Annotated[Session, Depends(get_db)]
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


class CredentialsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=254)
    password: SecretStr = Field(min_length=12, max_length=128)


class DeleteAccountInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: SecretStr = Field(min_length=1, max_length=128)


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def unauthorized():
    return HTTPException(
        401, "Sesión inválida o caducada. Inicia sesión.", headers={"WWW-Authenticate": "Bearer"}
    )


def current_user(db: DB, credentials: Credentials):
    if not credentials or len(credentials.credentials) > 256:
        raise unauthorized()
    session = db.get(AuthSession, digest(credentials.credentials))
    if not session or session.expires_at.replace(tzinfo=timezone.utc) <= now():
        raise unauthorized()
    user = db.get(User, session.user_id)
    if not user:
        raise unauthorized()
    return user


def user_scope(db: DB, user: Annotated[User, Depends(current_user)]):
    db.info["user_id"] = user.id
    return user


def public_user(user):
    return {"id": user.id, "email": user.email, "created_at": user.created_at}


def issue_session(db, user, response):
    token = secrets.token_urlsafe(48)
    expiry = now() + timedelta(days=7)
    db.add(AuthSession(token_hash=digest(token), user_id=user.id, expires_at=expiry))
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 604800,
        "expires_at": expiry,
        "user": public_user(user),
    }


@auth_router.post("/register", status_code=201)
def register(body: CredentialsInput, db: DB, response: Response):
    user = User(
        email=str(body.email).lower(), password_hash=hasher.hash(body.password.get_secret_value())
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "No se puede registrar ese correo.") from None
    return issue_session(db, user, response)


@auth_router.post("/login")
def login(body: CredentialsInput, db: DB, response: Response):
    user = db.scalar(select(User).where(User.email == str(body.email).lower()).with_for_update())
    valid = hasher.verify(
        body.password.get_secret_value(), user.password_hash if user else dummy_hash
    )
    locked = user and user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now()
    if not user or not valid or locked:
        if user and not locked:
            user.failed_logins += 1
            if user.failed_logins >= 5:
                user.locked_until = now() + timedelta(minutes=5)
                user.failed_logins = 0
            db.commit()
        raise HTTPException(401, "Credenciales incorrectas o acceso temporalmente bloqueado.")
    user.failed_logins = 0
    user.locked_until = None
    return issue_session(db, user, response)


@auth_router.get("/me")
def me(user: Annotated[User, Depends(current_user)]):
    return public_user(user)


@auth_router.post("/logout", status_code=204)
def logout(db: DB, credentials: Credentials, user: Annotated[User, Depends(current_user)]):
    db.delete(db.get(AuthSession, digest(credentials.credentials)))
    db.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})


@auth_router.post("/delete-account", status_code=204)
def delete_account(body: DeleteAccountInput, db: DB, user: Annotated[User, Depends(current_user)]):
    # Serialize password checks with login so the same lockout protects reauthentication.
    user = db.scalar(select(User).where(User.id == user.id).with_for_update())
    if not user:
        raise unauthorized()
    locked = user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now()
    if locked or not hasher.verify(body.password.get_secret_value(), user.password_hash):
        if not locked:
            user.failed_logins += 1
            if user.failed_logins >= 5:
                user.locked_until = now() + timedelta(minutes=5)
                user.failed_logins = 0
            db.commit()
        raise HTTPException(401, "Contraseña incorrecta o acceso temporalmente bloqueado.")
    # Profiles predate accounts and are not FK-linked to users. Delete explicitly;
    # the database cascades profile data and the account's sessions and plans.
    db.info['user_id'] = user.id
    profile = db.get(Profile, user.id)
    if profile:
        db.delete(profile)
        db.flush()
    db.delete(user)
    db.commit()
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
