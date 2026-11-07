from functools import lru_cache

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from config import get_settings


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine():
    url = get_settings().sqlalchemy_url
    kwargs = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["connect_args"] = {"prepare_threshold": None}
        if get_settings().database_pooling == "null":
            kwargs["poolclass"] = NullPool
        else:
            kwargs.update(pool_size=3, max_overflow=2)
    engine = create_engine(url, **kwargs)
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    return engine


def get_db():
    factory = sessionmaker(bind=get_engine(), expire_on_commit=False)
    with factory() as db:
        yield db


@event.listens_for(Session, "do_orm_execute")
def scope_personal_data(state):
    if not state.is_select or "user_id" not in state.session.info:
        return
    from sqlalchemy.orm import with_loader_criteria

    from models import Activity, Interview, Profile, WellbeingCompletion

    user_id = state.session.info.get("user_id", "__unauthenticated__")
    for model in (Activity, Interview, WellbeingCompletion):
        state.statement = state.statement.options(
            with_loader_criteria(model, lambda row: row.profile_id == user_id, include_aliases=True)
        )
    state.statement = state.statement.options(
        with_loader_criteria(Profile, lambda row: row.id == user_id, include_aliases=True)
    )
