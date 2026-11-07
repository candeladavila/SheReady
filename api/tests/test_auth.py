from datetime import timedelta

from auth import digest, user_scope
from main import app
from models import AuthSession, now


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
            "/auth/register", json={"email": email, "password": "a-long-test-password-123"}
        )
        assert r.status_code == 201, r.text
        assert r.headers["cache-control"] == "no-store"
        return {"Authorization": "Bearer " + r.json()["access_token"]}

    a = register("alice@example.com")
    assert client.put("/profile", json=profile, headers=a).status_code == 200
    interview = client.post("/interviews", json={"duration_minutes": 3}, headers=a).json()
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
