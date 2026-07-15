"""
RevisionHistory repository — DB access layer.
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.revision_history import RevisionHistory


class RevisionHistoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_or_replace(
        self,
        manuscript_id: str,
        parent_manuscript_id: str,
        from_version: int,
        to_version: int,
        revision_summary_json: str,
    ) -> RevisionHistory:
        # Remove existing revision summary for this version if any
        existing_result = await self.db.execute(
            select(RevisionHistory).where(RevisionHistory.manuscript_id == manuscript_id)
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            await self.db.delete(existing)
            await self.db.flush()

        revision = RevisionHistory(
            manuscript_id=manuscript_id,
            parent_manuscript_id=parent_manuscript_id,
            from_version=from_version,
            to_version=to_version,
            revision_summary_json=revision_summary_json,
        )
        self.db.add(revision)
        await self.db.flush()
        await self.db.refresh(revision)
        return revision

    async def get_by_manuscript(self, manuscript_id: str) -> Optional[RevisionHistory]:
        result = await self.db.execute(
            select(RevisionHistory).where(RevisionHistory.manuscript_id == manuscript_id)
        )
        return result.scalar_one_or_none()
