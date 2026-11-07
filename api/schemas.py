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
    plan_id: str | None = Field(default=None, max_length=36)
    duration_minutes: Literal[1, 3, 5, 10, 15] = 5


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


# Contrato de planificación: los textos de entrada son datos declarados por la usuaria,
# nunca instrucciones para el modelo ni una evaluación psicológica.
class PlanningContext(InputModel):
    strengths: list[ShortText] = Field(max_length=10)
    improvement_areas: list[ShortText] = Field(min_length=1, max_length=10)
    preferences: list[ShortText] = Field(default_factory=list, max_length=10)
    initial_answers: list[AnswerText] = Field(default_factory=list, max_length=5)


class PlanningRole(InputModel):
    title: ShortText
    sector: ShortText
    company: str = Field(default='', max_length=150)
    offer_url: str = Field(default='', max_length=2048)
    offer_description: str = Field(default='', max_length=6000)

    @model_validator(mode='after')
    def offer_present(self):
        if not self.offer_url.strip() and not self.offer_description.strip():
            raise ValueError('Añade el enlace o una descripción de la oferta.')
        return self


class PlanRequest(InputModel):
    context: PlanningContext
    target_role: PlanningRole


class PlannedQuestion(InputModel):
    text: str = Field(min_length=5, max_length=1200)
    skill: Skill
    category: Literal['technical', 'professional_situation', 'soft_skills']


class PlannedInterview(InputModel):
    title: str = Field(min_length=3, max_length=150)
    questions: list[PlannedQuestion] = Field(min_length=1, max_length=7)


class PlannedActivity(InputModel):
    type: Literal['guided_reflection', 'written_practice']
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=500)
    objective: str = Field(min_length=5, max_length=500)
    improvement_area: str = Field(min_length=2, max_length=150)
    skill: Skill
    duration_minutes: int = Field(ge=1, le=30)
    instructions: list[str] = Field(min_length=1, max_length=6)
    prompts: list[str] = Field(min_length=1, max_length=5)
    color: Literal['#593D83', '#B9A3DE', '#EF968D', '#BCE1D5', '#FAF8F5', '#282338']

    @field_validator('instructions', 'prompts')
    @classmethod
    def useful_lines(cls, values):
        if any(not line.strip() or len(line) > 500 for line in values):
            raise ValueError('Cada instrucción debe contener entre 1 y 500 caracteres.')
        return [line.strip() for line in values]


class PersonalizedPlan(InputModel):
    single_question: list[PlannedInterview] = Field(min_length=3, max_length=3)
    five_minutes: list[PlannedInterview] = Field(min_length=3, max_length=3)
    ten_minutes: list[PlannedInterview] = Field(min_length=3, max_length=3)
    fifteen_minutes: list[PlannedInterview] = Field(min_length=3, max_length=3)
    activities: list[PlannedActivity] = Field(min_length=3, max_length=3)

    @model_validator(mode='after')
    def question_counts(self):
        for name, expected in [('single_question', 1), ('five_minutes', 3), ('ten_minutes', 5), ('fifteen_minutes', 7)]:
            interviews = getattr(self, name)
            if any(len(interview.questions) != expected for interview in interviews):
                raise ValueError(f'{name} debe tener {expected} preguntas por simulacro.')
            signatures = [tuple(question.text.strip().casefold() for question in interview.questions) for interview in interviews]
            if len(set(signatures)) != len(signatures):
                raise ValueError(f'Los simulacros de {name} deben ser diferentes.')
        return self


class ExitReflection(InputModel):
    satisfaction: Literal[1, 2, 3, 4, 5]
    checkpoints: list[Literal['explained_experience', 'gave_example', 'asked_question', 'discussed_role', 'explained_interest']] = Field(max_length=5)
    reflection: str = Field(default='', max_length=4000)

    @field_validator('checkpoints')
    @classmethod
    def unique_checkpoints(cls, values):
        if len(values) != len(set(values)):
            raise ValueError('No se puede repetir un checkpoint.')
        return values


class InitialInterviewInput(InputModel):
    answers: list[AnswerText] = Field(min_length=5, max_length=5)


class InitialProfileContext(InputModel):
    strengths: list[ShortText] = Field(min_length=1, max_length=10)
    improvement_areas: list[ShortText] = Field(min_length=1, max_length=10)
    preferences: list[ShortText] = Field(default_factory=list, max_length=10)


class ReportSkill(InputModel):
    label: str = Field(min_length=2, max_length=80)
    level: Literal['fuerte', 'en_desarrollo', 'a_reforzar']
    evidence: str = Field(min_length=5, max_length=400)


class ReportStrength(InputModel):
    title: str = Field(min_length=2, max_length=100)
    evidence: str = Field(min_length=5, max_length=400)


class ReportPart(InputModel):
    label: str = Field(min_length=2, max_length=40)
    text: str = Field(min_length=5, max_length=600)


class ReportImprovement(InputModel):
    turn_id: str = Field(min_length=1, max_length=36)
    title: str = Field(min_length=3, max_length=120)
    observation: str = Field(min_length=5, max_length=500)
    original_excerpt: str = Field(min_length=1, max_length=600)
    framework: str = Field(min_length=2, max_length=100)
    parts: list[ReportPart] = Field(min_length=1, max_length=4)
    why: list[str] = Field(min_length=1, max_length=4)


class InterviewReport(InputModel):
    version: Literal['interview-report-v1']
    headline: str = Field(min_length=5, max_length=180)
    summary: str = Field(min_length=5, max_length=500)
    worked: str = Field(min_length=5, max_length=500)
    improvement: str = Field(min_length=5, max_length=500)
    focus: str = Field(min_length=5, max_length=500)
    skills: list[ReportSkill] = Field(min_length=1, max_length=6)
    strengths: list[ReportStrength] = Field(min_length=1, max_length=4)
    focus_title: str = Field(min_length=3, max_length=120)
    focus_explanation: str = Field(min_length=5, max_length=500)
    focus_advice: str = Field(min_length=5, max_length=500)
    checklist: list[str] = Field(min_length=1, max_length=5)
    improvements: list[ReportImprovement] = Field(min_length=1, max_length=5)
