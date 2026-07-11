"""
EditorialReport ORM model — final compiled report from Chief Editor Agent.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class EditorialReport(Base):
    __tablename__ = "editorial_reports"

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
    # Full structured JSON report as a text blob
    report_json: Mapped[str] = mapped_column(Text, nullable=False)
    # Convenience fields extracted from the report JSON
    overall_score: Mapped[float] = mapped_column(Float, nullable=True)
    executive_summary: Mapped[str] = mapped_column(Text, nullable=True)
    major_findings_count: Mapped[int] = mapped_column(String(10), nullable=True)
    minor_findings_count: Mapped[int] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    # Relationships
    manuscript: Mapped["Manuscript"] = relationship(  # noqa: F821
        "Manuscript", back_populates="editorial_report"
    )

    def __repr__(self) -> str:
        return f"<EditorialReport id={self.id} score={self.overall_score}>"
