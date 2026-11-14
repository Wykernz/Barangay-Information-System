import pytest
from django.test import Client


@pytest.mark.django_db
def test_session_requires_authentication():
    assert Client().get('/api/v1/session/').status_code == 403


@pytest.mark.django_db
def test_session_returns_only_current_username(django_user_model):
    user = django_user_model.objects.create_user(username='synthetic-staff')
    client = Client()
    client.force_login(user)
    assert client.get('/api/v1/session/').json() == {'username': 'synthetic-staff'}


@pytest.mark.django_db
def test_login_requires_csrf_even_for_anonymous_user():
    client = Client(enforce_csrf_checks=True)
    response = client.post('/api/v1/auth/login/', data={
        'username': 'synthetic-staff', 'password': 'synthetic-password',
    }, content_type='application/json')
    assert response.status_code == 403


@pytest.mark.django_db
def test_login_logout_and_session(django_user_model):
    from django.core.cache import cache

    cache.clear()
    django_user_model.objects.create_user(
        username='synthetic-staff', password='synthetic-password',
    )
    client = Client(enforce_csrf_checks=True)
    client.get('/api/v1/auth/csrf/')
    response = client.post('/api/v1/auth/login/', data={
        'username': 'synthetic-staff', 'password': 'synthetic-password',
    }, content_type='application/json', HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value)
    assert response.status_code == 200
    assert client.get('/api/v1/session/').status_code == 200
    response = client.post('/api/v1/auth/logout/',
        HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value)
    assert response.status_code == 200
    assert client.get('/api/v1/session/').status_code == 403


@pytest.mark.django_db
def test_inactive_account_cannot_login(django_user_model):
    from django.core.cache import cache

    cache.clear()
    django_user_model.objects.create_user(
        username='synthetic-inactive', password='synthetic-password', is_active=False,
    )
    response = Client().post('/api/v1/auth/login/', data={
        'username': 'synthetic-inactive', 'password': 'synthetic-password',
    }, content_type='application/json')
    assert response.status_code == 401
