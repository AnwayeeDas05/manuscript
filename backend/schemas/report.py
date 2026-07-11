"""
EditorialReport Pydantic schemas.
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class FindingSchema(BaseModel):
    id: str
    chapter: Optional[int]
    category: str  # character | plot | timeline | dialogue
    severity: str  # major | minor | suggestion
    title: str
    description: str
    evidence: Optional[str]
    recommendation: str


class AgentAnalysisSchema(BaseModel):
    score: float  # 0-10
    summary: str
    findings: list[FindingSchema]


class ReportSchema(BaseModel):
    """The full structured editorial report."""
    manuscript_id: str
    title: str
    executive_summary: str
    overall_score: float  # 0-10
    character_analysis: AgentAnalysisSchema
    plot_analysis: AgentAnalysisSchema
    timeline_analysis: AgentAnalysisSchema
    dialogue_analysis: AgentAnalysisSchema
    major_findings: list[FindingSchema]
    minor_findings: list[FindingSchema]
    recommendations: list[str]
    overall_assessment: str
    generated_at: str  # ISO datetime string


class EditorialReportResponse(BaseModel):
    id: str
    manuscript_id: str
    overall_score: Optional[float]
    executive_summary: Optional[str]
    major_findings_count: Optional[str]
    minor_findings_count: Optional[str]
    report_json: str  # Raw JSON string for full access
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    reports: list[EditorialReportResponse]
    total: int


class DashboardStats(BaseModel):
    total_manuscripts: int
    completed_manuscripts: int
    processing_manuscripts: int
    failed_manuscripts: int
    total_reports: int
    recent_manuscripts: list[Any]
    recent_reports: list[Any]
