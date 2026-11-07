from datetime import date, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)
from typing_extensions import Annotated

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
AnswerText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=6000)]
Skill = Literal["technical", "communication", "teamwork", "problem_solving", "self_presentation"]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProfileInput(InputModel):
    age: int = Field(ge=1, le=120)
    sector: ShortText
    target_role: ShortText
    experience_years: float = Field(ge=0, le=70)
    daily_minutes: int = Field(ge=1, le=120)
    strengths: list[ShortText] = Field(min_length=1, max_length=10)
    improvement_areas: list[ShortText] = Field(min_length=1, max_length=10)
    interview_date: date | None = None
    interview_in_days: int | None = Field(default=None, ge=0, le=730)

    @field_validator("strengths", "improvement_areas")
    @classmethod
    def unique_items(cls, values):
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def date_or_offset(self):
        if (self.interview_date is None) == (self.interview_in_days is None):
            raise ValueError("Indica interview_date o interview_in_days, solo uno de los dos.")
        return self


class AnswerInput(InputModel):
    answer: AnswerText


class InterviewInput(InputModel):
    duration_minutes: Literal[3, 5, 10, 15] = 5


class TurnAnswerInput(AnswerInput):
    turn_id: str = Field(min_length=1, max_length=36)


class Question(BaseModel):
    text: str = Field(min_length=5, max_length=1200)
    skill: Skill
    category: Literal["technical", "professional_situation", "soft_skills"]


class GeneratedActivity(Question):
    title: str = Field(min_length=3, max_length=150)
    instructions: str = Field(min_length=5, max_length=1000)


class Improvement(BaseModel):
    turn_id: str = Field(max_length=36)
    suggestion: str = Field(min_length=5, max_length=1200)
    reformulation: str = Field(min_length=5, max_length=1800)


class Recommendation(BaseModel):
    skill: Skill
    activity: str = Field(min_length=5, max_length=600)


class Feedback(BaseModel):
    summary: str = Field(min_length=5, max_length=1800)
    strengths: list[str] = Field(min_length=1, max_length=5)
    improvements: list[Improvement] = Field(min_length=1, max_length=10)
    recommended_activities: list[Recommendation] = Field(min_length=1, max_length=5)


class OnboardingDocument(InputModel):
    schema_version: Literal[1] = 1
    created_at: datetime
    completed: bool
    goals: list[ShortText] = Field(max_length=10)
    age_range: ShortText | None = None
    daily_time_choice: ShortText | None = None
    daily_minutes: int | None = Field(default=None, ge=1, le=120)
    sector: ShortText | None = None
