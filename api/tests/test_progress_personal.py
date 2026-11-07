from auth import user_scope
from main import app


def test_progress_is_scoped_to_each_account(client, profile):
    app.dependency_overrides.pop(user_scope)
    headers = []
    for email in ('progress-a@example.com', 'progress-b@example.com'):
        response = client.post('/auth/register', json={'email': email, 'password': 'a-long-password-123', 'display_name': 'Lucía'})
        assert response.status_code == 201
        auth = {'Authorization': 'Bearer ' + response.json()['access_token']}
        assert client.put('/profile', json=profile, headers=auth).status_code == 200
        headers.append(auth)
    assert client.post('/wellbeing/completions', json={'id': 'practice-a', 'kind': 'breathing', 'duration_seconds': 60}, headers=headers[0]).status_code == 200
    assert client.post('/wellbeing/completions', json={'id': 'practice-b', 'kind': 'confidence', 'duration_seconds': 0}, headers=headers[1]).status_code == 200
    personalized = {'id': 'personalized-a', 'kind': 'personalized', 'duration_seconds': 0}
    assert client.post('/wellbeing/completions', json=personalized, headers=headers[0]).status_code == 200
    assert client.post('/wellbeing/completions', json=personalized, headers=headers[0]).status_code == 200
    first = client.get('/progress', headers=headers[0]).json()
    second = client.get('/progress', headers=headers[1]).json()
    assert (first['completed_breathing'], first['completed_confidence']) == (1, 0)
    assert (second['completed_breathing'], second['completed_confidence']) == (0, 1)
    assert (first['completed_personalized'], second['completed_personalized']) == (1, 0)
    assert first['streak_days'] == 1
    assert first['week'][-1]['completed']
    assert {event['label'] for event in first['recent_events']} == {'Pausa para respirar', 'Actividad personalizada completada'}
    assert second['recent_events'][0]['label'] == 'Ejercicio de confianza'
