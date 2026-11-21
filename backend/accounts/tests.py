import pytest
from django.test import Client
from drf_spectacular.generators import SchemaGenerator


def test_session_schema_is_explicit():
    schema = SchemaGenerator().get_schema(request=None, public=True)

    response = schema['paths']['/api/v1/session/']['get']['responses']['200']
    reference = response['content']['application/json']['schema']['$ref']
    assert reference == '#/components/schemas/StaffSession'
    assert schema['components']['schemas']['StaffSession']['properties'] == {
        'username': {'type': 'string', 'readOnly': True, 'maxLength': 150},
        'display_name': {'type': 'string', 'readOnly': True},
        'health_only': {'type': 'boolean', 'readOnly': True},
    }


@pytest.mark.django_db
def test_session_requires_authentication():
    assert Client().get('/api/v1/session/').status_code == 403


@pytest.mark.django_db
def test_session_returns_only_current_username(django_user_model):
    user = django_user_model.objects.create_user(username='synthetic-staff')
    client = Client()
    client.force_login(user)
    assert client.get('/api/v1/session/').json() == {
        'username': 'synthetic-staff', 'display_name': 'synthetic-staff', 'health_only': False,
    }


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


@pytest.mark.django_db
def test_login_attempt_limit():
    from django.core.cache import cache

    cache.clear()
    client = Client()
    for _ in range(10):
        response = client.post('/api/v1/auth/login/', data={
            'username': 'synthetic-unknown', 'password': 'synthetic-password',
        }, content_type='application/json')
        assert response.status_code == 401
    response = client.post('/api/v1/auth/login/', data={
        'username': 'synthetic-unknown', 'password': 'synthetic-password',
    }, content_type='application/json')
    assert response.status_code == 429


@pytest.mark.parametrize('payload', ['[]', 'null', '{', '{"username": 123}'])
def test_malformed_login_rejected(payload):
    response = Client().post('/api/v1/auth/login/', data=payload,
                             content_type='application/json')
    assert response.status_code == 400
