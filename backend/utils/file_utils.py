"""
File-system utilities for manuscript uploads.
"""
import uuid
from pathlib import Path

from fastapi import UploadFile

from config import get_settings
from utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


def get_extension(filename: str) -> str:
    """Return lowercased file extension without the dot."""
    return Path(filename).suffix.lstrip(".").lower()


def validate_upload(file: UploadFile, size_bytes: int) -> None:
    """
    Raise ValueError if the upload fails validation.

    :param file: The uploaded file object.
    :param size_bytes: Actual byte-length of the file.
    """
    ext = get_extension(file.filename or "")
    if ext not in settings.allowed_extensions:
        raise ValueError(
            f"File type '.{ext}' is not supported. "
            f"Allowed: {', '.join('.' + e for e in settings.allowed_extensions)}"
        )
    if size_bytes > settings.max_file_size_bytes:
        max_mb = settings.max_file_size_mb
        raise ValueError(f"File exceeds the {max_mb} MB size limit.")


def save_upload(file_bytes: bytes, original_filename: str) -> Path:
    """
    Persist uploaded bytes to disk with a UUID-based filename.

    :returns: Path to the saved file.
    """
    ext = get_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    dest = settings.uploads_path / unique_name
    dest.write_bytes(file_bytes)
    logger.info("file_saved", path=str(dest), bytes=len(file_bytes))
    return dest


def delete_file(path: str) -> None:
    """Remove a file from disk; log but don't raise if missing."""
    p = Path(path)
    if p.exists():
        p.unlink()
        logger.info("file_deleted", path=path)
    else:
        logger.warning("file_not_found_for_deletion", path=path)
