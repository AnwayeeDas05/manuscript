"""
Repositories for ParsedDocument, Entity, Review, EditorialReport.
"""
import json
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.parsed_document import ParsedDocument
from models.entity import Entity
from models.review import Review
from models.editorial_report import EditorialReport


class ParsedDocumentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_or_replace(
        self,
        manuscript_id: str,
        full_text: str,
        chapters: list[dict],
        total_words: int,
        total_chapters: int,
    ) -> ParsedDocument:
        # Delete existing if present
        existing = await self.get_by_manuscript(manuscript_id)
        if existing:
            await self.db.delete(existing)
            await self.db.flush()

        doc = ParsedDocument(
            manuscript_id=manuscript_id,
            full_text=full_text,
            chapters_json=json.dumps(chapters),
            total_words=total_words,
            total_chapters=total_chapters,
        )
        self.db.add(doc)
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    async def get_by_manuscript(self, manuscript_id: str) -> Optional[ParsedDocument]:
        result = await self.db.execute(
            select(ParsedDocument).where(ParsedDocument.manuscript_id == manuscript_id)
        )
        return result.scalar_one_or_none()


class EntityRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def bulk_create(
        self, manuscript_id: str, entities: list[dict]
    ) -> list[Entity]:
        # Remove existing entities for this manuscript first
        existing = await self.db.execute(
            select(Entity).where(Entity.manuscript_id == manuscript_id)
        )
        for ent in existing.scalars().all():
            await self.db.delete(ent)
        await self.db.flush()

        created = []
        for e in entities:
            entity = Entity(
                manuscript_id=manuscript_id,
                entity_type=e["entity_type"],
                text=e["text"],
                canonical=e.get("canonical"),
                chapter_number=e.get("chapter_number"),
                frequency=e.get("frequency", 1),
                extra_json=json.dumps(e.get("extra")) if e.get("extra") else None,
            )
            self.db.add(entity)
            created.append(entity)
        await self.db.flush()
        return created

    async def list_by_manuscript(self, manuscript_id: str) -> list[Entity]:
        result = await self.db.execute(
            select(Entity).where(Entity.manuscript_id == manuscript_id)
        )
        return list(result.scalars().all())


class ReviewRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_or_replace(
        self, manuscript_id: str, agent_type: str
    ) -> Review:
        # Replace any existing review for this agent+manuscript
        existing_result = await self.db.execute(
            select(Review).where(
                Review.manuscript_id == manuscript_id,
                Review.agent_type == agent_type,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            await self.db.delete(existing)
            await self.db.flush()

        review = Review(manuscript_id=manuscript_id, agent_type=agent_type, status="running")
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def complete(
        self, review: Review, raw_response: str, score: Optional[float]
    ) -> Review:
        from datetime import datetime, timezone
        review.status = "completed"
        review.raw_response = raw_response
        review.score = score
        review.completed_at = datetime.now(tz=timezone.utc)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def fail(self, review: Review, error: str) -> Review:
        review.status = "failed"
        review.error_message = error
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def list_by_manuscript(self, manuscript_id: str) -> list[Review]:
        result = await self.db.execute(
            select(Review).where(Review.manuscript_id == manuscript_id)
        )
        return list(result.scalars().all())


class EditorialReportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_or_replace(
        self,
        manuscript_id: str,
        report_json: str,
        overall_score: float,
        executive_summary: str,
        major_count: int,
        minor_count: int,
    ) -> EditorialReport:
        existing_result = await self.db.execute(
            select(EditorialReport).where(
                EditorialReport.manuscript_id == manuscript_id
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            await self.db.delete(existing)
            await self.db.flush()

        report = EditorialReport(
            manuscript_id=manuscript_id,
            report_json=report_json,
            overall_score=overall_score,
            executive_summary=executive_summary,
            major_findings_count=str(major_count),
            minor_findings_count=str(minor_count),
        )
        self.db.add(report)
        await self.db.flush()
        await self.db.refresh(report)
        return report

    async def get_by_manuscript(self, manuscript_id: str) -> Optional[EditorialReport]:
        result = await self.db.execute(
            select(EditorialReport).where(
                EditorialReport.manuscript_id == manuscript_id
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, report_id: str) -> Optional[EditorialReport]:
        result = await self.db.execute(
            select(EditorialReport).where(EditorialReport.id == report_id)
        )
        return result.scalar_one_or_none()

    async def list_by_owner(
        self, owner_id: str, limit: int = 50
    ) -> list[EditorialReport]:
        from models.manuscript import Manuscript
        result = await self.db.execute(
            select(EditorialReport)
            .join(Manuscript, EditorialReport.manuscript_id == Manuscript.id)
            .where(Manuscript.owner_id == owner_id)
            .order_by(EditorialReport.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_owner(self, owner_id: str) -> int:
        from models.manuscript import Manuscript
        result = await self.db.execute(
            select(func.count())
            .select_from(EditorialReport)
            .join(Manuscript, EditorialReport.manuscript_id == Manuscript.id)
            .where(Manuscript.owner_id == owner_id)
        )
        return result.scalar_one()
