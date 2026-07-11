"""
Dashboard API — aggregated stats for the current user.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from database import get_db
from models.user import User
from repositories.document_repos import EditorialReportRepository
from repositories.manuscript_repo import ManuscriptRepository
from schemas.report import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardStats)
async def get_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return dashboard statistics for the current user."""
    ms_repo = ManuscriptRepository(db)
    rep_repo = EditorialReportRepository(db)

    total = await ms_repo.count_by_owner(current_user.id)
    completed = await ms_repo.count_by_owner_and_status(current_user.id, "completed")
    processing = await ms_repo.count_by_owner_and_status(current_user.id, "processing")
    failed = await ms_repo.count_by_owner_and_status(current_user.id, "failed")
    total_reports = await rep_repo.count_by_owner(current_user.id)

    recent_manuscripts = await ms_repo.list_by_owner(current_user.id, limit=5)
    recent_reports = await rep_repo.list_by_owner(current_user.id, limit=5)

    return DashboardStats(
        total_manuscripts=total,
        completed_manuscripts=completed,
        processing_manuscripts=processing,
        failed_manuscripts=failed,
        total_reports=total_reports,
        recent_manuscripts=[
            {
                "id": m.id,
                "title": m.title,
                "status": m.status,
                "word_count": m.word_count,
                "chapter_count": m.chapter_count,
                "created_at": m.created_at.isoformat(),
            }
            for m in recent_manuscripts
        ],
        recent_reports=[
            {
                "id": r.id,
                "manuscript_id": r.manuscript_id,
                "overall_score": r.overall_score,
                "major_findings_count": r.major_findings_count,
                "created_at": r.created_at.isoformat(),
            }
            for r in recent_reports
        ],
    )
