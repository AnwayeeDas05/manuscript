"""
RevisionHistory ORM model.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)

class RevisionHistory(Base):
    __tablename__ = "revision_histories"

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
    parent_manuscript_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("manuscripts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_version: Mapped[int] = mapped_column(Integer, nullable=False)
    to_version: Mapped[int] = mapped_column(Integer, nullable=False)
    revision_summary_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # Relationships
    manuscript: Mapped["Manuscript"] = relationship(
        "Manuscript",
        foreign_keys=[manuscript_id],
        back_populates="revision_history",
    )
