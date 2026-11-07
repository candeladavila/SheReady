from auth import user_scope
from main import app


def test_pending_document_belongs_only_to_logged_in_account(client, profile):
    app.dependency_overrides.pop(user_scope)
    document = {
        "schema_version": 1,
        "created_at": "2026-11-07T12:00:00Z",
        "completed": True,
        "goals": ["Preparar entrevistas"],
        "age_range": "25–34 años",
        "daily_time_choice": "5 minutos",
        "daily_minutes": 5,
        "sector": "Tecnología",
    }
    assert client.put("/profile/onboarding", json=document).status_code == 401

    def account(email):
        result = client.post(
            "/auth/register", json={"email": email, "password": "a-long-test-password-123", "display_name": "Alicia"}
        )
        assert result.status_code == 201
        return {"Authorization": "Bearer " + result.json()["access_token"]}

    a = account("document-a@example.com")
    saved = client.put("/profile/onboarding", json=document, headers=a)
    assert saved.status_code == 200, saved.text
    assert saved.json()["age"] is None  # A range must not become an invented exact age.
    assert saved.json()["target_role"] is None
    assert saved.json()["days_until_interview"] is None
    assert saved.json()["onboarding_document"]["goals"] == document["goals"]
    assert client.post("/interviews", json={"duration_minutes": 3}, headers=a).status_code == 201
    b = account("document-b@example.com")
    assert client.get("/profile", headers=b).status_code == 409
    assert (
        client.put(
            "/profile/onboarding", json=dict(document, user_id="another-account"), headers=b
        ).status_code
        == 422
    )
    assert client.put("/profile", json=profile, headers=a).status_code == 200
    assert (
        client.get("/profile", headers=a).json()["onboarding_document"]["goals"]
        == document["goals"]
    )
    changed = dict(document, goals=["Cambiar de sector"])
    result = client.put("/profile/onboarding", json=changed, headers=a).json()
    assert result["onboarding_document"]["goals"] == changed["goals"]
    assert result["target_role"] == profile["target_role"]
