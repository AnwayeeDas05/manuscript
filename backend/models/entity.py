"""
Entity ORM model — NLP-extracted named entities from a manuscript.
Designed for future expansion (new entity types require no schema change).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    manuscript_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("manuscripts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Entity type: PERSON | GPE | LOC | ORG | DATE | EVENT | DIALOGUE
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Normalised/canonical form (e.g. "John" for "John Smith")
    canonical: Mapped[str] = mapped_column(Text, nullable=True)
    # Chapter number where this entity first appears
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=True)
    # How many times this entity appears
    frequency: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # Optional JSON blob for extra attributes (e.g., dialogue speaker)
    extra_json: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # Relationships
    manuscript: Mapped["Manuscript"] = relationship(  # noqa: F821
        "Manuscript", back_populates="entities"
    )

    def __repr__(self) -> str:
        return f"<Entity type={self.entity_type} text={self.text!r}>"
