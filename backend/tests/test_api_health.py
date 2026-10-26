"""Tests for Health check, root redirection, and OpenAPI documentation."""

import pytest


class TestHealthAndDocumentation:
    """Tests for /api/health, OpenAPI, and Swagger documentation."""

    def test_health_check_endpoint(self, client):
        """GET /api/health returns healthy status and active database connectivity."""
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        assert data["app_name"] == "SLOTWISE"
        assert "version" in data
        assert "timestamp" in data

    def test_root_redirects_to_docs(self, client):
        """GET / redirects to interactive OpenAPI Swagger docs."""
        res = client.get("/", follow_redirects=False)
        assert res.status_code in (302, 307)
        assert res.headers["location"] == "/docs"

    def test_openapi_schema_endpoint(self, client):
        """GET /openapi.json returns valid OpenAPI 3.x document."""
        res = client.get("/openapi.json")
        assert res.status_code == 200
        schema = res.json()
        assert "paths" in schema
        assert "/api/exams" in schema["paths"]
        assert "/api/students" in schema["paths"]
        assert "/api/enrolments" in schema["paths"]
        assert "/api/graph/conflicts" in schema["paths"]
        assert "/api/sample-data" in schema["paths"]
        assert "/api/health" in schema["paths"]
