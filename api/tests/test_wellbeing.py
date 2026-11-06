def test_wellbeing_completion_idempotency_and_progress(client, profile):
    body = {"id": "practice-test-1", "kind": "breathing", "duration_seconds": 60}
    assert client.post("/wellbeing/completions", json=body).status_code == 409
    assert client.put("/profile", json=profile).status_code == 200
    assert client.post("/wellbeing/completions", json=body).status_code == 200
    assert client.post("/wellbeing/completions", json=body).status_code == 200
    assert client.get("/progress").json()["completed_wellbeing"] == 1
    assert (
        client.post("/wellbeing/completions", json={**body, "kind": "confidence"}).status_code
        == 409
    )
    assert (
        client.post("/wellbeing/completions", json={**body, "duration_seconds": -1}).status_code
        == 422
    )
