from fastapi import HTTPException
from test_personalized_plan import plan_data

from auth import user_scope
from main import app
from models import RolePlan
from schemas import InitialProfileContext, PersonalizedPlan


def test_initial_context_and_plans_are_private_and_reused(client):
    app.dependency_overrides.pop(user_scope)
    calls = []
    client.fake_ai.initial_profile = lambda answers, onboarding: InitialProfileContext(
        strengths=['Escucha'], improvement_areas=['Dar ejemplos'], preferences=[])
    def plan(context, role):
        calls.append((context, role))
        return PersonalizedPlan.model_validate(plan_data())
    client.fake_ai.plan = plan
    def account(name):
        result = client.post('/auth/register', json={'email': name, 'password': 'password-123456'})
        assert result.status_code == 201
        return {'Authorization': 'Bearer ' + result.json()['access_token']}
    a, b = account('one@example.com'), account('two@example.com')
    role = {'title': 'Diseñadora', 'sector': 'Tecnología', 'company': 'Empresa',
            'offer_url': '', 'offer_description': 'Diseño de productos'}
    assert client.post('/role-plans', json=role, headers=a).status_code == 409
    answers = ['Respuesta de ejemplo ' + str(i) for i in range(5)]
    assert client.put('/profile/initial-interview', json={'answers': answers}, headers=a).status_code == 200
    assert client.get('/profile/initial-interview', headers=b).json()['completed'] is False
    assert client.get('/profile', headers=a).json()['strengths'] == ['Escucha']
    first = client.post('/role-plans', json=role, headers=a)
    assert first.status_code == 200, first.text
    assert len(first.json()['plan']['activities']) == 3
    again = client.post('/role-plans', json=role, headers=a)
    assert again.json()['id'] == first.json()['id']
    assert len(calls) == 1
    second = client.post('/role-plans', json={**role, 'title': 'Investigadora'}, headers=a)
    assert second.status_code == 200
    assert second.json()['id'] != first.json()['id']
    assert len(calls) == 2
    assert calls[0][0]['initial_answers'] == answers
    assert client.get('/role-plans', headers=b).json()['items'] == []
    assert len(client.get('/role-plans', headers=a).json()['items']) == 2


def test_failed_plan_can_be_retried(client):
    app.dependency_overrides.pop(user_scope)
    result = client.post('/auth/register', json={'email': 'retry@example.com', 'password': 'password-123456'})
    headers = {'Authorization': 'Bearer ' + result.json()['access_token']}
    client.fake_ai.initial_profile = lambda answers, onboarding: InitialProfileContext(
        strengths=['Escucha'], improvement_areas=['Ejemplos'], preferences=[])
    client.put('/profile/initial-interview', json={'answers': ['Una respuesta'] * 5}, headers=headers)
    def failure(context, role):
        raise HTTPException(503, 'IA no disponible')
    client.fake_ai.plan = failure
    role = {'title': 'Diseñadora', 'sector': 'Tecnología', 'offer_description': 'Diseño de producto'}
    assert client.post('/role-plans', json=role, headers=headers).status_code == 503
    record = client.get('/role-plans', headers=headers).json()['items'][0]
    assert record['status'] == 'failed'
    with client.db_factory() as db:
        item = db.get(RolePlan, record['id'])
        item.status = 'generating'
        db.commit()
    assert client.post('/role-plans', json=role, headers=headers).status_code == 409
    with client.db_factory() as db:
        item = db.get(RolePlan, record['id'])
        item.status = 'failed'
        db.commit()
    client.fake_ai.plan = lambda context, role: PersonalizedPlan.model_validate(plan_data())
    assert client.post('/role-plans', json=role, headers=headers).json()['status'] == 'ready'
    assert len(client.get('/role-plans', headers=headers).json()['items']) == 1
