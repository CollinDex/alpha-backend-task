import json

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.briefing import Briefing, BriefingKeyPoint, BriefingMetric, BriefingRisk

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_create_briefing():
    """Test creating a briefing with valid data."""
    payload = {
        "companyName": "Acme Holdings",
        "ticker": "acme",
        "sector": "Industrial Technology",
        "analystName": "Jane Doe",
        "summary": "Acme is benefiting from strong enterprise demand.",
        "recommendation": "Monitor for margin expansion.",
        "keyPoints": [
            "Revenue grew 18% year-over-year.",
            "Management raised full-year guidance.",
        ],
        "risks": [
            "Top two customers account for 41% of total revenue.",
        ],
        "metrics": [
            {"name": "Revenue Growth", "value": "18%"},
            {"name": "Operating Margin", "value": "22.4%"},
        ],
    }

    response = client.post("/briefings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["companyName"] == "Acme Holdings"
    assert data["ticker"] == "ACME"
    assert data["sector"] == "Industrial Technology"
    assert len(data["keyPoints"]) == 2
    assert len(data["risks"]) == 1
    assert len(data["metrics"]) == 2


def test_create_briefing_insufficient_key_points():
    """Test that creation fails with less than 2 key points."""
    payload = {
        "companyName": "Company",
        "ticker": "COMP",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Recommendation",
        "keyPoints": ["Only one point"],
        "risks": ["One risk"],
    }

    response = client.post("/briefings", json=payload)
    assert response.status_code == 422


def test_create_briefing_insufficient_risks():
    """Test that creation fails with no risks."""
    payload = {
        "companyName": "Company",
        "ticker": "COMP",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Recommendation",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": [],
    }

    response = client.post("/briefings", json=payload)
    assert response.status_code == 422


def test_create_briefing_duplicate_metric_names():
    """Test that creation fails with duplicate metric names."""
    payload = {
        "companyName": "Company",
        "ticker": "COMP",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Recommendation",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"],
        "metrics": [
            {"name": "Growth", "value": "10%"},
            {"name": "Growth", "value": "20%"},
        ],
    }

    response = client.post("/briefings", json=payload)
    assert response.status_code == 422


def test_get_briefing():
    """Test retrieving a briefing."""
    payload = {
        "companyName": "Test Company",
        "ticker": "TEST",
        "sector": "Technology",
        "analystName": "Test Analyst",
        "summary": "Test summary",
        "recommendation": "Test recommendation",
        "keyPoints": ["Key point 1", "Key point 2"],
        "risks": ["Risk 1"],
    }

    create_response = client.post("/briefings", json=payload)
    briefing_id = create_response.json()["id"]

    response = client.get(f"/briefings/{briefing_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == briefing_id
    assert data["companyName"] == "Test Company"


def test_get_briefing_not_found():
    """Test that getting a non-existent briefing returns 404."""
    response = client.get("/briefings/9999")
    assert response.status_code == 404


def test_generate_briefing_report():
    """Test generating an HTML report for a briefing."""
    payload = {
        "companyName": "Report Test Co",
        "ticker": "RTC",
        "sector": "Finance",
        "analystName": "Report Analyst",
        "summary": "Strong fundamentals with potential for growth.",
        "recommendation": "Strong Buy - Undervalued at current levels.",
        "keyPoints": [
            "Consistent revenue growth over 5 years",
            "Strong balance sheet with low debt",
        ],
        "risks": [
            "Market volatility could impact stock price",
            "Regulatory changes in key markets",
        ],
        "metrics": [
            {"name": "P/E Ratio", "value": "15.2x"},
            {"name": "ROE", "value": "18.5%"},
        ],
    }

    create_response = client.post("/briefings", json=payload)
    briefing_id = create_response.json()["id"]

    response = client.post(f"/briefings/{briefing_id}/generate")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "generated"
    assert data["generated_at"] is not None


def test_get_briefing_html():
    """Test retrieving the generated HTML for a briefing."""
    payload = {
        "companyName": "HTML Test Co",
        "ticker": "HTC",
        "sector": "Retail",
        "analystName": "HTML Analyst",
        "summary": "Test summary for HTML generation.",
        "recommendation": "Test recommendation.",
        "keyPoints": ["Key point 1", "Key point 2"],
        "risks": ["Risk 1"],
    }

    create_response = client.post("/briefings", json=payload)
    briefing_id = create_response.json()["id"]

    client.post(f"/briefings/{briefing_id}/generate")

    response = client.get(f"/briefings/{briefing_id}/html")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    html_content = response.text
    assert "<html" in html_content.lower()
    assert "HTML Test Co" in html_content
    assert "HTC" in html_content


def test_get_briefing_html_not_generated():
    """Test that requesting HTML for non-generated briefing returns error."""
    payload = {
        "companyName": "No HTML Co",
        "ticker": "NHC",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Recommendation",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"],
    }

    create_response = client.post("/briefings", json=payload)
    briefing_id = create_response.json()["id"]

    response = client.get(f"/briefings/{briefing_id}/html")
    assert response.status_code == 404


def test_briefing_with_no_optional_fields():
    """Test creating briefing with minimal required fields (no optional metrics)."""
    payload = {
        "companyName": "Minimal Co",
        "ticker": "MIN",
        "sector": "Services",
        "analystName": "Minimal Analyst",
        "summary": "Brief summary.",
        "recommendation": "Brief recommendation.",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"],
    }

    response = client.post("/briefings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["metrics"] == []


def test_ticker_normalization():
    """Test that ticker is normalized to uppercase."""
    payload = {
        "companyName": "Ticker Test",
        "ticker": "lower",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Recommendation",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"],
    }

    response = client.post("/briefings", json=payload)
    assert response.status_code == 201
    assert response.json()["ticker"] == "LOWER"
