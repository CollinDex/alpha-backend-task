from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.briefing import (
    BriefingGenerateResponse,
    BriefingResponse,
    CreateBriefingRequest,
)
from app.services.briefing_service import BriefingService
from app.services.report_formatter import ReportFormatter

router = APIRouter(prefix="/briefings", tags=["briefings"])
formatter = ReportFormatter()


@router.post("", response_model=BriefingResponse, status_code=status.HTTP_201_CREATED)
def create_briefing(
    request: CreateBriefingRequest,
    db: Session = Depends(get_db),
) -> BriefingResponse:
    """
    Create a new briefing from structured JSON input.

    Validates all required fields and enforces constraints:
    - At least 2 key points required
    - At least 1 risk required
    - Unique metric names within the briefing
    """
    service = BriefingService(db)
    briefing = service.create_briefing(request)
    return BriefingResponse.model_validate(briefing)


@router.get("/{briefing_id}", response_model=BriefingResponse)
def get_briefing(
    briefing_id: int,
    db: Session = Depends(get_db),
) -> BriefingResponse:
    """
    Retrieve a briefing by ID with all associated data.

    Returns the complete briefing structure including key points, risks, and metrics.
    """
    service = BriefingService(db)
    briefing = service.get_briefing(briefing_id)
    if not briefing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Briefing not found"
        )
    return BriefingResponse.model_validate(briefing)


@router.post("/{briefing_id}/generate", response_model=BriefingGenerateResponse)
def generate_briefing_report(
    briefing_id: int,
    db: Session = Depends(get_db),
) -> BriefingGenerateResponse:
    """
    Generate an HTML report for an existing briefing.

    This endpoint:
    1. Reads the stored briefing data
    2. Transforms it into a report view model
    3. Renders an HTML report using Jinja2
    4. Marks the briefing as generated
    """
    service = BriefingService(db)
    briefing = service.get_briefing(briefing_id)
    if not briefing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Briefing not found"
        )

    # Render the HTML report
    html_content = formatter.render_briefing_report(briefing)

    # Mark briefing as generated and store HTML
    briefing = service.generate_html(briefing_id, html_content)

    return BriefingGenerateResponse.model_validate(briefing)


@router.get("/{briefing_id}/html", response_class=HTMLResponse)
def get_briefing_html(
    briefing_id: int,
    db: Session = Depends(get_db),
) -> str:
    """
    Retrieve the generated HTML for a briefing.

    Returns the actual HTML content with proper content-type for browser rendering.
    """
    service = BriefingService(db)
    html_content = service.get_html_content(briefing_id)
    if not html_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing HTML not generated or briefing not found",
        )
    return html_content
