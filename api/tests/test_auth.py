from datetime import timedelta

from auth import digest, user_scope
from main import app
from models import AuthSession, Interview, InterviewTurn, now
from services import interview_view


def test_accounts_are_isolated_and_logout_revokes(client, profile):
    app.dependency_overrides.pop(user_scope)
    assert client.get("/profile").status_code == 401
    assert (
        client.post(
            "/auth/login", json={"email": "absent@example.com", "password": "wrong-password-123"}
        ).status_code
        == 401
    )

    def register(email):
        r = client.post(
            "/auth/register", json={"email": email, "password": "a-long-test-password-123", "display_name": "Alicia"}
        )
        assert r.status_code == 201, r.text
        assert r.headers["cache-control"] == "no-store"
        return {"Authorization": "Bearer " + r.json()["access_token"]}

    a = register("alice@example.com")
    saved_profile = client.put("/profile", json=profile, headers=a)
    assert saved_profile.status_code == 200
    assert client.post("/interviews", json={"duration_minutes": 3}, headers=a).status_code == 409
    with client.db_factory() as db:
        item = Interview(profile_id=saved_profile.json()['id'], duration_minutes=3, max_questions=2, profile_snapshot={})
        item.turns.append(InterviewTurn(position=1, question=client.fake_ai.question({}, [], []).model_dump()))
        db.add(item)
        db.commit()
        interview = interview_view(item)
    activity = client.post("/activities/daily", headers=a).json()
    assert (
        client.post(
            f"/activities/{activity['id']}/answer",
            json={"answer": "Mi experiencia de ejemplo"},
            headers=a,
        ).status_code
        == 200
    )
    b = register("bob@example.com")
    assert client.get("/profile", headers=b).status_code == 409
    assert client.put("/profile", json=dict(profile, sector="Otro"), headers=b).status_code == 200
    assert client.get("/interviews", headers=b).json()["total"] == 0
    assert client.get("/activities", headers=b).json()["total"] == 0
    for method, path in [
        ("GET", f"/interviews/{interview['id']}"),
        ("DELETE", f"/interviews/{interview['id']}"),
        ("POST", f"/interviews/{interview['id']}/finish"),
        ("GET", f"/activities/{activity['id']}"),
    ]:
        assert client.request(method, path, headers=b).status_code == 404
    assert client.get("/profile", headers=a).json()["sector"] == profile["sector"]
    assert client.get("/progress", headers=b).json()["recommendations"] == []
    assert client.get("/progress", headers=b).json()["completed_activities"] == 0
    assert client.get("/progress", headers=a).json()["completed_activities"] == 1
    assert client.get("/auth/me", headers=a).json()["email"] == "alice@example.com"
    assert client.get("/auth/me", headers=a).json()["display_name"] == "Alicia"
    assert client.post("/auth/logout", headers=a).status_code == 204
    assert client.get("/auth/me", headers=a).status_code == 401
    assert client.get("/auth/me", headers=b).status_code == 200
    login = client.post(
        "/auth/login", json={"email": "ALICE@example.com", "password": "a-long-test-password-123"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    with client.db_factory() as db:
        session = db.get(AuthSession, digest(token))
        assert session.token_hash != token
        session.expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert client.get("/profile", headers={"Authorization": "Bearer " + token}).status_code == 401


def test_delete_account_requires_password_and_removes_only_owner_data(client, profile):
    from test_personalized_plan import plan_data

    from models import InitialProfile, Interview, InterviewTurn, Profile, RolePlan, User
    from schemas import InitialProfileContext, PersonalizedPlan

    app.dependency_overrides.pop(user_scope)
    def register(email):
        result = client.post('/auth/register', json={'email': email, 'password': 'long-password-12345', 'display_name': 'Lucía'})
        assert result.status_code == 201
        body = result.json()
        return body['user']['id'], {'Authorization': 'Bearer ' + body['access_token']}
    owner, owner_headers = register('delete-owner@example.com')
    other, other_headers = register('delete-other@example.com')
    assert client.put('/profile', json=profile, headers=owner_headers).status_code == 200
    assert client.put('/profile', json=profile, headers=other_headers).status_code == 200
    client.fake_ai.initial_profile = lambda answers, onboarding: InitialProfileContext(
        strengths=['Escucha'], improvement_areas=['Ejemplos'], preferences=[])
    client.fake_ai.plan = lambda context, role: PersonalizedPlan.model_validate(plan_data())
    assert client.put('/profile/initial-interview', json={'answers': ['Una respuesta'] * 5}, headers=owner_headers).status_code == 200
    role = {'title': 'Diseñadora', 'sector': 'Tecnología', 'offer_description': 'Diseño de producto'}
    plan = client.post('/role-plans', json=role, headers=owner_headers).json()
    interview = client.post('/interviews', json={'duration_minutes': 1, 'plan_id': plan['id']}, headers=owner_headers).json()
    assert client.post('/auth/delete-account', json={'password': 'incorrecta'}, headers=owner_headers).status_code == 401
    assert client.get('/auth/me', headers=owner_headers).status_code == 200
    assert client.post('/auth/delete-account', json={'password': 'long-password-12345'}, headers=owner_headers).status_code == 204
    assert client.get('/auth/me', headers=owner_headers).status_code == 401
    assert client.get('/profile', headers=other_headers).status_code == 200
    with client.db_factory() as db:
        assert db.get(User, owner) is None
        assert db.get(Profile, owner) is None
        assert db.get(InitialProfile, owner) is None
        assert db.get(RolePlan, plan['id']) is None
        assert db.get(Interview, interview['id']) is None
        assert db.get(InterviewTurn, interview['current_turn']['id']) is None
        assert db.get(User, other) is not None
        assert db.get(Profile, other) is not None


def test_register_name_validation_and_persistence(client):
    app.dependency_overrides.pop(user_scope)
    payload = {"email": "name@example.com", "password": "a-long-test-password-123", "display_name": "   "}
    assert client.post("/auth/register", json=payload).status_code == 422
    payload["display_name"] = "  María  "
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["user"]["display_name"] == "María"
    login = client.post("/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login.json()["user"]["display_name"] == "María"
