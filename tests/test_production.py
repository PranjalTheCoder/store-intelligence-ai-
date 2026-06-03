import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from app.main import app
from app.database import get_db

client = TestClient(app)

def test_empty_store_metrics():
    response = client.get("/stores/NON_EXISTENT_STORE/metrics")
    assert response.status_code == 200
    assert response.json()["unique_visitors"] == 0

def test_database_unavailable_handler():
    def mock_db_fail():
        raise OperationalError("SELECT 1", params=None, orig=Exception("Connection lost"))
        
    app.dependency_overrides[get_db] = mock_db_fail
    response = client.get("/stores/STORE_1/metrics")
    app.dependency_overrides.clear()
    
    assert response.status_code == 503
    assert response.json()["error"] == "DATABASE_UNAVAILABLE"