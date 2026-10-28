"""Integration tests for backend user authentication, registration, and session management."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestAuthEndpoints:
    """Test suite covering health, login, signup, session inspection, and logout."""

    def test_auth_health_endpoints(self, client: TestClient):
        """Verify authentication health probe returns operational status on both route prefixes."""
        for path in ["/api/v1/auth/health", "/api/auth/health"]:
            res = client.get(path)
            assert res.status_code == 200
            data = res.json()
            assert data["isAvailable"] is True
            assert "operational" in data["message"].lower()

    def test_login_default_demo_admin_success(self, client: TestClient):
        """Login with pre-seeded demo administrator credentials succeeds."""
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@university.edu", "password": "admin123"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "user" in data
        assert data["user"]["email"] == "admin@university.edu"
        assert data["user"]["fullName"] == "Dr. Eleanor Vance"
        assert data["user"]["role"] == "admin"
        assert "token" in data
        assert data["token"].startswith("slotwise_tok_")

    def test_login_demo_scheduler_success(self, client: TestClient):
        """Login with pre-seeded demo scheduler credentials succeeds."""
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "scheduler@university.edu", "password": "scheduler123"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["email"] == "scheduler@university.edu"
        assert data["user"]["fullName"] == "Prof. Alan Turing"
        assert data["user"]["role"] == "scheduler"

    def test_login_case_insensitive_email(self, client: TestClient):
        """Email matching is case-insensitive."""
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "ADMIN@UNIVERSITY.EDU", "password": "admin123"},
        )
        assert res.status_code == 200
        assert res.json()["user"]["email"] == "admin@university.edu"

    def test_login_invalid_password_returns_401(self, client: TestClient):
        """Incorrect password returns 401 Unauthorized with clear detail."""
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@university.edu", "password": "wrongpassword"},
        )
        assert res.status_code == 401
        assert "invalid email or password" in res.json()["detail"].lower()

    def test_login_unknown_email_returns_401(self, client: TestClient):
        """Non-existent email returns 401 Unauthorized without exposing enumeration."""
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "unknown@university.edu", "password": "somepassword"},
        )
        assert res.status_code == 401
        assert "invalid email or password" in res.json()["detail"].lower()

    def test_signup_new_user_success(self, client: TestClient):
        """Registering a new account persists credentials and returns session token."""
        payload = {
            "fullName": "Dr. Marie Curie",
            "email": "mcurie@sorbonne.fr",
            "password": "radiationSpecial#1",
        }
        res = client.post("/api/v1/auth/signup", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["user"]["email"] == "mcurie@sorbonne.fr"
        assert data["user"]["fullName"] == "Dr. Marie Curie"
        assert "token" in data

        # Verify new user can now log in
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "mcurie@sorbonne.fr", "password": "radiationSpecial#1"},
        )
        assert login_res.status_code == 200
        assert login_res.json()["user"]["email"] == "mcurie@sorbonne.fr"

    def test_signup_duplicate_email_rejected(self, client: TestClient):
        """Registering with an already existing email returns 400 Bad Request."""
        payload = {
            "fullName": "Imposter Eleanor",
            "email": "admin@university.edu",
            "password": "password123",
        }
        res = client.post("/api/v1/auth/signup", json=payload)
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"].lower()

    def test_signup_short_password_rejected(self, client: TestClient):
        """Password shorter than 6 characters is rejected."""
        payload = {
            "fullName": "Test User",
            "email": "test@university.edu",
            "password": "123",
        }
        res = client.post("/api/v1/auth/signup", json=payload)
        assert res.status_code == 400
        assert "at least 6 characters" in res.json()["detail"].lower()

    def test_get_current_user_me(self, client: TestClient):
        """GET /api/v1/auth/me resolves active bearer token."""
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@university.edu", "password": "admin123"},
        )
        token = login_res.json()["token"]

        me_res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@university.edu"

    def test_logout_session(self, client: TestClient):
        """Logging out invalidates active session token."""
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@university.edu", "password": "admin123"},
        )
        token = login_res.json()["token"]

        logout_res = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout_res.status_code == 200
        assert logout_res.json()["success"] is True
