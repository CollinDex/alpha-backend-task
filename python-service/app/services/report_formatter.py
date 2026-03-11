from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models.briefing import Briefing

_TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"


class ReportFormatter:
    """Formatter utility for generating professional reports."""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATE_DIR)),
            autoescape=select_autoescape(
                enabled_extensions=("html", "xml"), default_for_string=True
            ),
        )

    def render_base(self, title: str, body: str) -> str:
        template = self._env.get_template("base.html")
        return template.render(
            title=title, body=body, generated_at=self.generated_timestamp()
        )

    def render_briefing_report(self, briefing: Briefing) -> str:
        """Render a briefing report using the briefing template."""
        template = self._env.get_template("briefing_report.html")
        context = self._format_briefing_for_template(briefing)
        return template.render(**context)

    @staticmethod
    def _format_briefing_for_template(briefing: Briefing) -> dict[str, Any]:
        """
        Transform a briefing record into a template context.

        Returns a dictionary with formatted and organized data ready for Jinja2.
        """
        now = datetime.now(timezone.utc)
        return {
            "title": f"{briefing.company_name} ({briefing.ticker}) - Briefing Report",
            "company_name": briefing.company_name,
            "ticker": briefing.ticker,
            "sector": briefing.sector,
            "analyst_name": briefing.analyst_name,
            "summary": briefing.summary,
            "recommendation": briefing.recommendation,
            "key_points": [
                {"order": kp.order, "content": kp.content}
                for kp in sorted(briefing.key_points, key=lambda x: x.order)
            ],
            "risks": [
                {"order": r.order, "content": r.content}
                for r in sorted(briefing.risks, key=lambda x: x.order)
            ],
            "metrics": [
                {"name": m.name, "value": m.value, "order": m.order}
                for m in sorted(briefing.metrics, key=lambda x: x.order)
            ]
            if briefing.metrics
            else [],
            "generated_at": now.isoformat(),
            "generated_date": now.strftime("%B %d, %Y"),
            "generated_time": now.strftime("%I:%M %p"),
        }

    @staticmethod
    def generated_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()
