"""
Review ORM model — stores per-agent AI review output.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    manuscript_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("manuscripts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # agent_type: character | plot | timeline | dialogue | chief_editor
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Raw JSON response from the AI agent
    raw_response: Mapped[str] = mapped_column(Text, nullable=True)
    # Parsed score 0-10
    score: Mapped[float] = mapped_column(Float, nullable=True)
    # status: pending | running | completed | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    manuscript: Mapped["Manuscript"] = relationship(  # noqa: F821
        "Manuscript", back_populates="reviews"
    )

    def __repr__(self) -> str:
        return f"<Review agent={self.agent_type} manuscript={self.manuscript_id}>"
