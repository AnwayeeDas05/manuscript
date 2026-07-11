"""
Reports API — list and get editorial reports.
"""
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from database import get_db
from models.user import User
from repositories.document_repos import EditorialReportRepository
from repositories.manuscript_repo import ManuscriptRepository
from schemas.report import EditorialReportResponse, ReportListResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=ReportListResponse)
async def list_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
):
    """List all editorial reports for the current user."""
    repo = EditorialReportRepository(db)
    reports = await repo.list_by_owner(current_user.id, limit=limit)
    total = await repo.count_by_owner(current_user.id)
    return ReportListResponse(reports=reports, total=total)


@router.get("/{report_id}", response_model=EditorialReportResponse)
async def get_report(
    report_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single editorial report by ID."""
    rep_repo = EditorialReportRepository(db)
    report = await rep_repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    # Verify ownership via manuscript
    ms_repo = ManuscriptRepository(db)
    manuscript = await ms_repo.get_by_id_and_owner(report.manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return report


@router.get("/{report_id}/json")
async def get_report_json(
    report_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Download the full report as a raw JSON file."""
    rep_repo = EditorialReportRepository(db)
    report = await rep_repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    ms_repo = ManuscriptRepository(db)
    manuscript = await ms_repo.get_by_id_and_owner(report.manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    filename = f"report_{report_id}.json"
    return Response(
        content=report.report_json,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/by-manuscript/{manuscript_id}", response_model=EditorialReportResponse)
async def get_report_by_manuscript(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the editorial report for a specific manuscript."""
    ms_repo = ManuscriptRepository(db)
    manuscript = await ms_repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    rep_repo = EditorialReportRepository(db)
    report = await rep_repo.get_by_manuscript(manuscript_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not generated yet. Trigger processing first.",
        )
    return report
