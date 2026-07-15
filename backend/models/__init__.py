"""
Models package — import all models so Alembic auto-detects them.
"""
from models.user import User
from models.manuscript import Manuscript
from models.parsed_document import ParsedDocument
from models.entity import Entity
from models.review import Review
from models.editorial_report import EditorialReport
from models.revision_history import RevisionHistory

__all__ = [
    "User",
    "Manuscript",
    "ParsedDocument",
    "Entity",
    "Review",
    "EditorialReport",
    "RevisionHistory",
]
