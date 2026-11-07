from fastapi import HTTPException
from test_personalized_plan import plan_data

from auth import user_scope
from main import app
from models import RolePlan
from schemas import InitialProfileContext, InterviewReport, PersonalizedPlan


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
        result = client.post('/auth/register', json={'email': name, 'password': 'password-123456', 'display_name': 'Lucía'})
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
    seen = []
    for _ in range(4):
        interview = client.post('/interviews', json={'duration_minutes': 1, 'plan_id': first.json()['id']}, headers=a)
        assert interview.status_code == 201, interview.text
        seen.append(interview.json()['current_turn']['question']['text'])
    assert len(set(seen[:3])) == 3
    assert seen[0] == seen[3]
    assert client.post('/interviews', json={'duration_minutes': 1, 'plan_id': first.json()['id']}, headers=b).status_code == 409
    assert client.put('/profile/initial-interview', json={'answers': answers}, headers=b).status_code == 200
    assert client.post('/interviews', json={'duration_minutes': 1, 'plan_id': first.json()['id']}, headers=b).status_code == 404
    practice = client.post('/interviews', json={'duration_minutes': 5, 'plan_id': first.json()['id']}, headers=a).json()
    assert practice['current_turn']['question']['text'] == plan_data()['five_minutes'][0]['questions'][0]['text']
    next_turn = client.post(f"/interviews/{practice['id']}/answers", json={'turn_id': practice['current_turn']['id'], 'answer': 'Una respuesta concreta'}, headers=a)
    assert next_turn.json()['current_turn']['question']['text'] == plan_data()['five_minutes'][0]['questions'][1]['text']
    report = {
        'version': 'interview-report-v1', 'headline': 'Una práctica para seguir creciendo',
        'summary': 'Sigue practicando con ejemplos.', 'worked': 'Has compartido una respuesta.',
        'improvement': 'Puedes añadir más detalles.', 'focus': 'Explica una acción concreta.',
        'skills': [{'label': 'Ejemplos', 'level': 'a_reforzar', 'evidence': 'La respuesta fue breve.'}],
        'strengths': [{'title': 'Participación', 'evidence': 'Has respondido la pregunta.'}],
        'focus_title': 'Estructura tu respuesta', 'focus_explanation': 'Usa un ejemplo concreto.',
        'focus_advice': 'Habla de tu aportación.', 'checklist': ['Explica qué hiciste.'],
        'improvements': [{'turn_id': practice['current_turn']['id'], 'title': 'Añade un ejemplo',
            'observation': 'Puedes concretar.', 'original_excerpt': 'texto inventado',
            'framework': 'STAR', 'parts': [{'label': 'Acción', 'text': '[Describe tu acción]'}],
            'why': ['Más concreto']}],
    }
    client.fake_ai.interview_report = lambda profile, turns: InterviewReport.model_validate(report)
    assert client.post(f"/interviews/{practice['id']}/finish", headers=a).status_code == 502
    report['improvements'][0]['original_excerpt'] = 'Una respuesta concreta'
    finished = client.post(f"/interviews/{practice['id']}/finish", headers=a)
    assert finished.status_code == 200
    assert finished.json()['feedback']['version'] == 'interview-report-v1'
    for duration, field in [(10, 'ten_minutes'), (15, 'fifteen_minutes')]:
        questions = []
        for _ in range(4):
            generated = client.post('/interviews', json={'duration_minutes': duration, 'plan_id': first.json()['id']}, headers=a)
            assert generated.status_code == 201
            questions.append(generated.json()['current_turn']['question']['text'])
        assert questions[0] == plan_data()[field][0]['questions'][0]['text']
        assert len(set(questions[:3])) == 3
        assert questions[3] == questions[0]


def test_failed_plan_can_be_retried(client):
    app.dependency_overrides.pop(user_scope)
    result = client.post('/auth/register', json={'email': 'retry@example.com', 'password': 'password-123456', 'display_name': 'Lucía'})
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


def test_initial_interview_provider_failure_does_not_complete_profile(client):
    app.dependency_overrides.pop(user_scope)
    assert client.get('/profile/initial-interview').status_code == 401
    result = client.post('/auth/register', json={'email': 'failure@example.com', 'password': 'password-123456', 'display_name': 'Lucía'})
    headers = {'Authorization': 'Bearer ' + result.json()['access_token']}
    def unavailable(answers, onboarding):
        raise HTTPException(503, 'IA no disponible')
    client.fake_ai.initial_profile = unavailable
    response = client.put('/profile/initial-interview', json={'answers': ['Una respuesta'] * 5}, headers=headers)
    assert response.status_code == 503
    assert client.get('/profile/initial-interview', headers=headers).json()['completed'] is False
    assert client.get('/profile', headers=headers).status_code == 409


def test_concurrent_plan_generation_calls_provider_once(client):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event

    app.dependency_overrides.pop(user_scope)
    result = client.post('/auth/register', json={'email': 'race@example.com', 'password': 'password-123456', 'display_name': 'Lucía'})
    headers = {'Authorization': 'Bearer ' + result.json()['access_token']}
    client.fake_ai.initial_profile = lambda answers, onboarding: InitialProfileContext(
        strengths=['Escucha'], improvement_areas=['Ejemplos'], preferences=[])
    assert client.put('/profile/initial-interview', json={'answers': ['Una respuesta'] * 5}, headers=headers).status_code == 200
    started, release = Event(), Event()
    calls = []
    def slow_plan(context, role):
        calls.append(1)
        started.set()
        if not release.wait(5):
            raise RuntimeError('La prueba agotó el tiempo')
        return PersonalizedPlan.model_validate(plan_data())
    client.fake_ai.plan = slow_plan
    role = {'title': 'Diseñadora', 'sector': 'Tecnología', 'offer_description': 'Diseño de producto'}
    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(client.post, '/role-plans', json=role, headers=headers)
        try:
            assert started.wait(5)
            second = client.post('/role-plans', json=role, headers=headers)
            assert second.status_code == 409
        finally:
            release.set()
        assert first.result(timeout=5).status_code == 200
    assert len(calls) == 1
    assert len(client.get('/role-plans', headers=headers).json()['items']) == 1
