"""
Manuscript ORM model.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "pdf" | "docx"
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="uploaded"
    )
    # status values: uploaded | processing | completed | failed
    word_count: Mapped[int] = mapped_column(Integer, nullable=True)
    chapter_count: Mapped[int] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="manuscripts")  # noqa: F821
    parsed_document: Mapped["ParsedDocument"] = relationship(  # noqa: F821
        "ParsedDocument", back_populates="manuscript", cascade="all, delete-orphan", uselist=False
    )
    entities: Mapped[list["Entity"]] = relationship(  # noqa: F821
        "Entity", back_populates="manuscript", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(  # noqa: F821
        "Review", back_populates="manuscript", cascade="all, delete-orphan"
    )
    editorial_report: Mapped["EditorialReport"] = relationship(  # noqa: F821
        "EditorialReport", back_populates="manuscript", cascade="all, delete-orphan", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Manuscript id={self.id} title={self.title} status={self.status}>"
