"""
EditorialReport Pydantic schemas.
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class FindingSchema(BaseModel):
    id: str
    chapter: Optional[int] = None
    category: Optional[str] = None  # character | plot | timeline | dialogue
    severity: str  # critical | major | moderate | minor | suggestion
    title: str
    description: str
    evidence: Optional[str] = None
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
    overall_score: float  # 0-100
    character_analysis: AgentAnalysisSchema
    plot_analysis: AgentAnalysisSchema
    timeline_analysis: AgentAnalysisSchema
    dialogue_analysis: AgentAnalysisSchema
    critical_findings: list[FindingSchema] = []
    major_findings: list[FindingSchema]
    moderate_findings: list[FindingSchema] = []
    minor_findings: list[FindingSchema]
    suggestions: list[FindingSchema] = []
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
    critical_findings_count: Optional[str] = None
    moderate_findings_count: Optional[str] = None
    suggestions_count: Optional[str] = None
    report_json: str  # Raw JSON string for full access
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    reports: list[EditorialReportResponse]
    total: int


class RevisionSummaryResponse(BaseModel):
    """Structured comparison between two manuscript versions."""
    from_version: int
    to_version: int
    score_change: float
    issues_fixed: list[dict] = []
    issues_still_present: list[dict] = []
    new_issues: list[dict] = []
    summary: str


class DashboardStats(BaseModel):
    total_manuscripts: int
    completed_manuscripts: int
    processing_manuscripts: int
    failed_manuscripts: int
    total_reports: int
    recent_manuscripts: list[Any]
    recent_reports: list[Any]
