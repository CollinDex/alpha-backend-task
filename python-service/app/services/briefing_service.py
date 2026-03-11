from datetime import datetime

from sqlalchemy.orm import Session

from app.models.briefing import Briefing, BriefingKeyPoint, BriefingMetric, BriefingRisk
from app.schemas.briefing import CreateBriefingRequest


class BriefingService:
    def __init__(self, db: Session):
        self.db = db

    def create_briefing(self, request: CreateBriefingRequest) -> Briefing:
        """Create a new briefing with associated key points, risks, and metrics."""
        briefing = Briefing(
            company_name=request.company_name,
            ticker=request.ticker,
            sector=request.sector,
            analyst_name=request.analyst_name,
            summary=request.summary,
            recommendation=request.recommendation,
        )
        self.db.add(briefing)
        self.db.flush()  # Get the ID without committing

        # Add key points
        for idx, point in enumerate(request.key_points):
            key_point = BriefingKeyPoint(
                briefing_id=briefing.id,
                content=point,
                order=idx,
            )
            self.db.add(key_point)

        # Add risks
        for idx, risk in enumerate(request.risks):
            risk_obj = BriefingRisk(
                briefing_id=briefing.id,
                content=risk,
                order=idx,
            )
            self.db.add(risk_obj)

        # Add metrics
        for idx, metric in enumerate(request.metrics):
            metric_obj = BriefingMetric(
                briefing_id=briefing.id,
                name=metric.name,
                value=metric.value,
                order=idx,
            )
            self.db.add(metric_obj)

        self.db.commit()
        self.db.refresh(briefing)
        return briefing

    def get_briefing(self, briefing_id: int) -> Briefing | None:
        """Retrieve a briefing by ID with all relationships loaded."""
        return self.db.query(Briefing).filter(Briefing.id == briefing_id).first()

    def generate_html(self, briefing_id: int, html_content: str) -> Briefing:
        """Mark a briefing as generated and store the HTML content."""
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            raise ValueError(f"Briefing {briefing_id} not found")

        briefing.html_content = html_content
        briefing.generated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(briefing)
        return briefing

    def get_html_content(self, briefing_id: int) -> str | None:
        """Retrieve the HTML content for a briefing."""
        briefing = self.get_briefing(briefing_id)
        if not briefing:
            raise ValueError(f"Briefing {briefing_id} not found")
        return briefing.html_content
