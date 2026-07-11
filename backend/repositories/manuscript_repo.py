"""
Manuscript repository — DB access layer for Manuscript model.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.manuscript import Manuscript


class ManuscriptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        owner_id: str,
        title: str,
        original_filename: str,
        file_path: str,
        file_size_bytes: int,
        file_type: str,
        author: Optional[str] = None,
    ) -> Manuscript:
        manuscript = Manuscript(
            owner_id=owner_id,
            title=title,
            original_filename=original_filename,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            file_type=file_type,
            author=author,
            status="uploaded",
        )
        self.db.add(manuscript)
        await self.db.flush()
        await self.db.refresh(manuscript)
        return manuscript

    async def get_by_id(self, manuscript_id: str) -> Optional[Manuscript]:
        result = await self.db.execute(
            select(Manuscript).where(Manuscript.id == manuscript_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_owner(
        self, manuscript_id: str, owner_id: str
    ) -> Optional[Manuscript]:
        result = await self.db.execute(
            select(Manuscript).where(
                Manuscript.id == manuscript_id, Manuscript.owner_id == owner_id
            )
        )
        return result.scalar_one_or_none()

    async def list_by_owner(
        self, owner_id: str, limit: int = 50, offset: int = 0
    ) -> list[Manuscript]:
        result = await self.db.execute(
            select(Manuscript)
            .where(Manuscript.owner_id == owner_id)
            .order_by(Manuscript.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_by_owner(self, owner_id: str) -> int:
        result = await self.db.execute(
            select(func.count()).where(Manuscript.owner_id == owner_id)
        )
        return result.scalar_one()

    async def count_by_owner_and_status(self, owner_id: str, status: str) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Manuscript.owner_id == owner_id, Manuscript.status == status
            )
        )
        return result.scalar_one()

    async def update_status(
        self,
        manuscript: Manuscript,
        status: str,
        error_message: Optional[str] = None,
        word_count: Optional[int] = None,
        chapter_count: Optional[int] = None,
    ) -> Manuscript:
        manuscript.status = status
        if error_message is not None:
            manuscript.error_message = error_message
        if word_count is not None:
            manuscript.word_count = word_count
        if chapter_count is not None:
            manuscript.chapter_count = chapter_count
        if status == "completed":
            manuscript.processed_at = datetime.now(tz=timezone.utc)
        await self.db.flush()
        await self.db.refresh(manuscript)
        return manuscript

    async def delete(self, manuscript: Manuscript) -> None:
        await self.db.delete(manuscript)
        await self.db.flush()
