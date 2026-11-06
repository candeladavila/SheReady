from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def uid() -> str:
    return str(uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="demo")
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (UniqueConstraint("profile_id", "day", name="uq_activity_profile_day"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    day: Mapped[date] = mapped_column(Date)
    content: Mapped[dict] = mapped_column(JSON)
    answer: Mapped[str | None] = mapped_column(Text)
    feedback: Mapped[dict | None] = mapped_column(JSON)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    version: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"version_id_col": version}


class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer)
    max_questions: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="active")
    profile_snapshot: Mapped[dict] = mapped_column(JSON)
    feedback: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"version_id_col": version}
    turns: Mapped[list["InterviewTurn"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="InterviewTurn.position"
    )


class InterviewTurn(Base):
    __tablename__ = "interview_turns"
    __table_args__ = (UniqueConstraint("interview_id", "position", name="uq_interview_position"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    interview_id: Mapped[str] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    question: Mapped[dict] = mapped_column(JSON)
    answer: Mapped[str | None] = mapped_column(Text)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
