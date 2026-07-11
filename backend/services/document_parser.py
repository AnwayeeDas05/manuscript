"""
Document parser service.
Extracts text from PDF (via PyMuPDF) and DOCX (via python-docx),
splits into chapters, cleans formatting.
"""
import re
from dataclasses import dataclass, field
from pathlib import Path

from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Chapter:
    number: int
    title: str
    text: str
    word_count: int = field(default=0)

    def __post_init__(self):
        self.word_count = len(self.text.split())


@dataclass
class ParsedManuscript:
    full_text: str
    chapters: list[Chapter]
    total_words: int = field(default=0)
    total_chapters: int = field(default=0)

    def __post_init__(self):
        self.total_words = sum(c.word_count for c in self.chapters) or len(
            self.full_text.split()
        )
        self.total_chapters = len(self.chapters)

    def to_dict(self) -> dict:
        return {
            "full_text": self.full_text,
            "chapters": [
                {
                    "number": c.number,
                    "title": c.title,
                    "text": c.text,
                    "word_count": c.word_count,
                }
                for c in self.chapters
            ],
            "total_words": self.total_words,
            "total_chapters": self.total_chapters,
        }


# ── Chapter-detection patterns ────────────────────────────────────────────────
_CHAPTER_PATTERNS = [
    r"^(?:CHAPTER|Chapter|chapter)\s+(?:\d+|[IVXLCDM]+)(?:\s*[:\-–—]\s*.+)?$",
    r"^(?:PART|Part)\s+(?:\d+|[IVXLCDM]+)(?:\s*[:\-–—]\s*.+)?$",
    r"^\d+\.\s+[A-Z].+$",           # "1. Title Case"
    r"^={3,}\s*.+\s*={3,}$",         # === Title ===
]
_CHAPTER_RE = re.compile("|".join(_CHAPTER_PATTERNS), re.MULTILINE)


def _clean_text(text: str) -> str:
    """Remove excessive whitespace, control characters, and formatting artifacts."""
    # Replace non-breaking spaces
    text = text.replace("\xa0", " ")
    # Replace Windows-style line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse 3+ blank lines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove trailing spaces on each line
    text = "\n".join(line.rstrip() for line in text.splitlines())
    return text.strip()


def _split_into_chapters(text: str) -> list[Chapter]:
    """
    Split full text into chapters using heading detection.
    Falls back to a single chapter if no headings found.
    """
    lines = text.splitlines()
    chapter_starts: list[tuple[int, str]] = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and _CHAPTER_RE.match(stripped):
            chapter_starts.append((i, stripped))

    if not chapter_starts:
        # Treat the whole manuscript as one chapter
        return [Chapter(number=1, title="Full Manuscript", text=text)]

    chapters: list[Chapter] = []
    for idx, (start_line, heading) in enumerate(chapter_starts):
        end_line = (
            chapter_starts[idx + 1][0] if idx + 1 < len(chapter_starts) else len(lines)
        )
        body = "\n".join(lines[start_line + 1 : end_line]).strip()
        chapters.append(Chapter(number=idx + 1, title=heading, text=body))

    return chapters


# ── PDF ───────────────────────────────────────────────────────────────────────

def _parse_pdf(path: Path) -> str:
    """Extract text from all pages of a PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
    except ImportError as e:
        raise RuntimeError("PyMuPDF is not installed.") from e

    doc = fitz.open(str(path))
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text("text"))  # type: ignore[attr-defined]
    doc.close()
    logger.info("pdf_parsed", path=str(path), pages=len(pages))
    return "\n\n".join(pages)


# ── DOCX ──────────────────────────────────────────────────────────────────────

def _parse_docx(path: Path) -> str:
    """Extract text from a DOCX file using python-docx."""
    try:
        from docx import Document
    except ImportError as e:
        raise RuntimeError("python-docx is not installed.") from e

    doc = Document(str(path))
    paragraphs: list[str] = [p.text for p in doc.paragraphs if p.text.strip()]
    logger.info("docx_parsed", path=str(path), paragraphs=len(paragraphs))
    return "\n\n".join(paragraphs)


# ── Public API ────────────────────────────────────────────────────────────────

def parse_document(file_path: str, file_type: str) -> ParsedManuscript:
    """
    Parse a manuscript file (PDF or DOCX) into structured text.

    :param file_path: Absolute path to the file.
    :param file_type: "pdf" or "docx".
    :raises ValueError: If the file type is unsupported.
    :raises FileNotFoundError: If the file does not exist.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Manuscript file not found: {file_path}")

    if file_type == "pdf":
        raw_text = _parse_pdf(path)
    elif file_type == "docx":
        raw_text = _parse_docx(path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    clean = _clean_text(raw_text)
    chapters = _split_into_chapters(clean)

    logger.info(
        "document_parsed",
        file=str(path),
        chapters=len(chapters),
        words=sum(c.word_count for c in chapters),
    )
    return ParsedManuscript(full_text=clean, chapters=chapters)
