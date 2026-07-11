"""
ParsedDocument ORM model — stores extracted text broken into chapters.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class ParsedDocument(Base):
    __tablename__ = "parsed_documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    manuscript_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("manuscripts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    full_text: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON-serialised list[dict] with keys: number, title, text, word_count
    chapters_json: Mapped[str] = mapped_column(Text, nullable=True)
    total_words: Mapped[int] = mapped_column(Integer, nullable=True)
    total_chapters: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # Relationships
    manuscript: Mapped["Manuscript"] = relationship(  # noqa: F821
        "Manuscript", back_populates="parsed_document"
    )

    def __repr__(self) -> str:
        return f"<ParsedDocument id={self.id} manuscript_id={self.manuscript_id}>"
