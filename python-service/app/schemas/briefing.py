from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class MetricInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., min_length=1, max_length=255)


class CreateBriefingRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    ticker: str = Field(..., min_length=1, max_length=10)
    sector: str = Field(..., min_length=1, max_length=255)
    analyst_name: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    key_points: list[str] = Field(..., min_items=2)
    risks: list[str] = Field(..., min_items=1)
    metrics: list[MetricInput] = Field(default_factory=list)

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("key_points")
    @classmethod
    def validate_key_points(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("At least 2 key points are required")
        return [point.strip() for point in v if point.strip()]

    @field_validator("risks")
    @classmethod
    def validate_risks(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("At least 1 risk is required")
        return [risk.strip() for risk in v if risk.strip()]

    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, v: list[MetricInput]) -> list[MetricInput]:
        metric_names = set()
        for metric in v:
            if metric.name in metric_names:
                raise ValueError(f"Duplicate metric name: {metric.name}")
            metric_names.add(metric.name)
        return v


class MetricResponse(BaseModel):
    id: int
    name: str
    value: str

    model_config = {"from_attributes": True}


class BriefingKeyPointResponse(BaseModel):
    id: int
    content: str

    model_config = {"from_attributes": True}


class BriefingRiskResponse(BaseModel):
    id: int
    content: str

    model_config = {"from_attributes": True}


class BriefingResponse(BaseModel):
    id: int
    company_name: str
    ticker: str
    sector: str
    analyst_name: str
    summary: str
    recommendation: str
    key_points: list[BriefingKeyPointResponse]
    risks: list[BriefingRiskResponse]
    metrics: list[MetricResponse]
    generated_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BriefingGenerateResponse(BaseModel):
    id: int
    status: str = "generated"
    generated_at: datetime

    model_config = {"from_attributes": True}
