from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm.exc import StaleDataError

from ai import get_ai
from config import get_settings
from main import app
from models import Activity, Interview, InterviewTurn
from services import today


def onboard(client, profile):
    response = client.put("/profile", json=profile)
    assert response.status_code == 200, response.text
    return response.json()


def answer(client, interview, text="He desarrollado una aplicación con mi equipo."):
    return client.post(
        f"/interviews/{interview['id']}/answers",
        json={"turn_id": interview["current_turn"]["id"], "answer": text},
    )


def test_onboarding_validation_date_and_edit(client, profile):
    assert client.get("/profile").status_code == 409
    data = onboard(client, profile)
    assert data["interview_date"] == (today() + timedelta(days=7)).isoformat()
    assert data["days_until_interview"] == 7
    for field in [
        "age",
        "sector",
        "target_role",
        "experience_years",
        "daily_minutes",
        "strengths",
        "improvement_areas",
    ]:
        invalid = {k: v for k, v in profile.items() if k != field}
        assert client.put("/profile", json=invalid).status_code == 422
    assert client.put("/profile", json={**profile, "strengths": []}).status_code == 422
    assert (
        client.put("/profile", json={**profile, "interview_date": "2027-01-01"}).status_code == 422
    )
    edited = {k: v for k, v in profile.items() if k != "interview_in_days"}
    edited.update(interview_date="2027-01-01", target_role="Ingeniera de datos")
    assert client.put("/profile", json=edited).json()["target_role"] == "Ingeniera de datos"
    assert client.get("/profile").json()["interview_date"] == "2027-01-01"


def test_daily_activity_persistence_and_retry(client, profile):
    onboard(client, profile)
    first = client.post("/activities/daily").json()
    assert client.post("/activities/daily").json()["id"] == first["id"]
    url = f"/activities/{first['id']}/answer"
    result = client.post(url, json={"answer": "Expliqué mi aportación al equipo."})
    assert result.status_code == 200
    assert result.json()["feedback"]["improvements"][0]["turn_id"] == first["id"]
    assert client.post(url, json={"answer": "Expliqué mi aportación al equipo."}).status_code == 200
    assert client.post(url, json={"answer": "Otra respuesta"}).status_code == 409
    assert client.get("/activities").json()["total"] == 1
    assert client.get("/progress").json()["completed_activities"] == 1


def test_complete_voice_workflow_and_delete_personalization(client, profile):
    onboard(client, profile)
    created = client.post("/interviews", json={"duration_minutes": 3})
    assert created.status_code == 201
    interview = created.json()
    iid, tid = interview["id"], interview["current_turn"]["id"]
    assert client.post(f"/interviews/{iid}/finish").status_code == 409
    audio = client.get(f"/interviews/{iid}/turns/{tid}/speech")
    assert audio.status_code == 200 and audio.headers["content-type"].startswith("audio/wav")
    transcript = client.post(
        f"/interviews/{iid}/transcriptions",
        files={"file": ("answer.webm", b"fake audio", "audio/webm;codecs=opus")},
    ).json()
    assert transcript["saved"] is False
    assert client.get(f"/interviews/{iid}").json()["turns"][0]["answer"] is None
    result = answer(client, interview, transcript["transcript"])
    assert result.status_code == 200
    assert answer(client, interview, transcript["transcript"]).json()["answered_questions"] == 1
    assert answer(client, interview, "Una respuesta diferente").status_code == 409
    second = result.json()
    final = answer(client, second).json()
    assert final["ready_to_finish"] is True
    assert final["answered_questions"] == 2
    finished = client.post(f"/interviews/{iid}/finish").json()
    assert finished["status"] == "completed" and finished["feedback"]
    assert client.post(f"/interviews/{iid}/finish").json()["feedback"] == finished["feedback"]
    assert client.get("/interviews").json()["total"] == 1
    p = client.get("/progress").json()
    assert p["completed_interviews"] == 1 and p["recommendations"]
    assert client.delete(f"/interviews/{iid}").status_code == 204
    assert client.get(f"/interviews/{iid}").status_code == 404
    p = client.get("/progress").json()
    assert p["completed_interviews"] == 0 and p["recommendations"] == []
    with client.db_factory() as db:
        assert db.scalars(select(InterviewTurn)).all() == []


def test_early_finish_keeps_unanswered_out_of_progress(client, profile):
    onboard(client, profile)
    interview = client.post("/interviews", json={"duration_minutes": 10}).json()
    answer(client, interview)
    finished = client.post(f"/interviews/{interview['id']}/finish").json()
    assert finished["answered_questions"] == 1
    assert client.get("/progress").json()["answered_interview_questions"] == 1


def test_provider_failure_does_not_save_or_advance(client, profile):
    onboard(client, profile)
    interview = client.post("/interviews", json={}).json()
    original = client.fake_ai.question

    def unavailable(*args):
        raise HTTPException(429, "Cuota agotada")

    client.fake_ai.question = unavailable
    assert answer(client, interview).status_code == 429
    saved = client.get(f"/interviews/{interview['id']}").json()
    assert saved["answered_questions"] == 0
    client.fake_ai.question = original
    assert answer(client, interview).status_code == 200


def test_no_key_never_returns_fake_activity(client, profile):
    onboard(client, profile)
    del app.dependency_overrides[get_ai]
    assert client.post("/activities/daily").status_code == 503
    assert client.get("/activities").json()["total"] == 0


def test_audio_limits_and_wrong_turn(client, profile, monkeypatch):
    onboard(client, profile)
    interview = client.post("/interviews", json={}).json()
    url = f"/interviews/{interview['id']}/transcriptions"
    assert client.post(url, files={"file": ("x.txt", b"a", "text/plain")}).status_code == 415
    assert client.post(url, files={"file": ("x.wav", b"", "audio/wav")}).status_code == 422
    monkeypatch.setenv("MAX_AUDIO_BYTES", "1024")
    get_settings.cache_clear()
    assert client.post(url, files={"file": ("x.wav", b"a" * 1025, "audio/wav")}).status_code == 413
    assert (
        client.post(
            f"/interviews/{interview['id']}/answers", json={"turn_id": "missing", "answer": "Texto"}
        ).status_code
        == 404
    )


def test_auth_content_and_openapi(client, monkeypatch):
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "test-token")
    get_settings.cache_clear()
    assert client.get("/profile/options").status_code == 200
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").status_code == 200
    for url in ["/news", "/events", "/wellbeing/activities"]:
        response = client.get(url, headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 200 and response.json()["is_sample"] is True
    assert (
        "/interviews/{interview_id}/transcriptions" in client.get("/openapi.json").json()["paths"]
    )


def test_optimistic_concurrency_blocks_lost_update(client, profile):
    onboard(client, profile)
    iid = client.post("/interviews", json={}).json()["id"]
    with client.db_factory() as one, client.db_factory() as two:
        first, second = one.get(Interview, iid), two.get(Interview, iid)
        first.version += 1
        one.commit()
        second.version += 1
        with pytest.raises(StaleDataError):
            two.commit()


def test_activity_rollback_on_feedback_failure(client, profile):
    onboard(client, profile)
    aid = client.post("/activities/daily").json()["id"]

    def unavailable(*args):
        raise HTTPException(502, "Error del proveedor")

    client.fake_ai.feedback = unavailable
    assert (
        client.post(f"/activities/{aid}/answer", json={"answer": "Una respuesta"}).status_code
        == 502
    )
    with client.db_factory() as db:
        item = db.get(Activity, aid)
        assert item.answer is None and item.completed_at is None
