from copy import deepcopy

import pytest
from pydantic import ValidationError

from ai import GeminiProvider
from schemas import ExitReflection, PersonalizedPlan


def plan_data():
    question = {
        "text": "¿Cómo presentarías tu experiencia?",
        "skill": "communication",
        "category": "soft_skills",
    }

    def interviews(count):
        return [
            {
                "title": f"Práctica {index}",
                "questions": [
                    {
                        **question,
                        "text": f"Pregunta {index + 1}.{number + 1}: ¿Cómo presentarías tu experiencia?",
                    }
                    for number in range(count)
                ],
            }
            for index in range(3)
        ]

    activity = {
        "type": "guided_reflection",
        "title": "Explica tus logros",
        "description": "Describe una experiencia profesional.",
        "objective": "Explicar con claridad un logro.",
        "improvement_area": "Comunicación",
        "skill": "communication",
        "duration_minutes": 3,
        "instructions": ["Elige un ejemplo real."],
        "prompts": ["¿Qué hiciste y qué aprendiste?"],
        "color": "#B9A3DE",
    }
    return {
        "single_question": interviews(1),
        "five_minutes": interviews(3),
        "ten_minutes": interviews(5),
        "fifteen_minutes": interviews(7),
        "activities": [activity.copy() for _ in range(3)],
    }


def test_complete_plan_and_invalid_shapes():
    plan = PersonalizedPlan.model_validate(plan_data())
    assert (
        len(plan.single_question)
        == len(plan.five_minutes)
        == len(plan.ten_minutes)
        == len(plan.fifteen_minutes)
        == 3
    )
    invalid = deepcopy(plan_data())
    invalid["ten_minutes"][0]["questions"].pop()
    with pytest.raises(ValidationError):
        PersonalizedPlan.model_validate(invalid)
    invalid = deepcopy(plan_data())
    invalid["activities"][0]["color"] = "#123456"
    with pytest.raises(ValidationError):
        PersonalizedPlan.model_validate(invalid)
    invalid = deepcopy(plan_data())
    invalid["single_question"][1] = deepcopy(invalid["single_question"][0])
    with pytest.raises(ValidationError):
        PersonalizedPlan.model_validate(invalid)
    invalid = deepcopy(plan_data())
    invalid["activities"].pop()
    with pytest.raises(ValidationError):
        PersonalizedPlan.model_validate(invalid)


def test_plan_passes_context_and_role_in_one_request():
    class CapturingProvider(GeminiProvider):
        def structured(self, schema, task, data):
            self.schema, self.task, self.data = schema, task, data
            return schema.model_validate(plan_data())

    provider = CapturingProvider()
    context = {
        "strengths": ["Escucha"],
        "improvement_areas": ["Ejemplos"],
        "preferences": [],
        "initial_answers": [],
    }
    role = {
        "title": "Diseñadora",
        "sector": "Tecnología",
        "offer_description": "Diseño de producto",
    }
    result = provider.plan(context, role)
    assert provider.data == {"context": context, "target_role": role}
    assert provider.schema is PersonalizedPlan
    assert len(result.activities) == 3


def test_plan_endpoint_uses_request_without_implicit_demo_profile(client):
    client.fake_ai.plan = lambda context, role: PersonalizedPlan.model_validate(plan_data())
    response = client.post(
        "/plans/generate",
        json={
            "context": {"strengths": ["Escucha"], "improvement_areas": ["Ejemplos"]},
            "target_role": {
                "title": "Diseñadora",
                "sector": "Tecnología",
                "offer_description": "Diseño de producto",
            },
        },
    )
    assert response.status_code == 200
    assert len(response.json()["single_question"]) == 3
    invalid = client.post(
        "/plans/generate",
        json={
            "context": {"strengths": [], "improvement_areas": ["Comunicación"]},
            "target_role": {"title": "Diseñadora", "sector": "Tecnología"},
        },
    )
    assert invalid.status_code == 422


def test_exit_reflection_and_single_question_interview(client):
    assert (
        ExitReflection.model_validate(
            {"satisfaction": 4, "checkpoints": ["gave_example"], "reflection": ""}
        ).reflection
        == ""
    )
    with pytest.raises(ValidationError):
        ExitReflection.model_validate({"satisfaction": 6, "checkpoints": []})
    with pytest.raises(ValidationError):
        ExitReflection.model_validate(
            {"satisfaction": 4, "checkpoints": ["gave_example", "gave_example"]}
        )
    profile = {
        "age": 30,
        "sector": "Tecnología",
        "target_role": "Diseñadora",
        "experience_years": 2,
        "daily_minutes": 10,
        "strengths": ["Escucha"],
        "improvement_areas": ["Comunicación"],
        "interview_in_days": 5,
    }
    assert client.put("/profile", json=profile).status_code == 200
    response = client.post("/interviews", json={"duration_minutes": 1})
    assert response.status_code == 201
    assert response.json()["max_questions"] == 1
    item = response.json()
    answer = client.post(
        f"/interviews/{item['id']}/answers",
        json={"turn_id": item["current_turn"]["id"], "answer": "Una respuesta de ejemplo."},
    )
    assert answer.status_code == 200
    assert answer.json()["current_turn"] is None
