"""
Manuscripts API — upload (with version support), list, get, process, versions, revision summary.
"""
import json
import mimetypes
import os
from typing import Annotated, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from database import get_db
from models.user import User
from repositories.document_repos import ParsedDocumentRepository
from repositories.manuscript_repo import ManuscriptRepository
from repositories.revision_repo import RevisionHistoryRepository
from schemas.manuscript import ManuscriptListResponse, ManuscriptResponse, ManuscriptUpdateRequest
from schemas.report import RevisionSummaryResponse
from services.manuscript_service import process_manuscript
from utils.file_utils import save_upload, validate_upload
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/manuscripts", tags=["Manuscripts"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_manuscript(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form(None),
    auto_process: bool = Form(True),
    upload_mode: Optional[str] = Form(None),  # "new" | "version" | None (triggers duplicate check)
):
    """
    Upload a manuscript PDF or DOCX file.
    
    If upload_mode is None and a manuscript with the same title exists,
    returns a 409 response prompting the user to choose a mode.
    If upload_mode="version", creates a new version of the existing manuscript.
    If upload_mode="new", creates a brand new root manuscript.
    """
    file_bytes = await file.read()

    try:
        validate_upload(file, len(file_bytes))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    repo = ManuscriptRepository(db)

    # Duplicate detection when no mode is specified
    if upload_mode is None:
        existing = await repo.find_by_title_and_owner(title, current_user.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "status": "duplicate_found",
                    "message": f"A manuscript titled '{title}' already exists.",
                    "existing_id": existing.id,
                    "existing_version": existing.version_number,
                },
            )

    # Persist file to disk
    saved_path = save_upload(file_bytes, file.filename or "manuscript")
    file_type = saved_path.suffix.lstrip(".")

    if upload_mode == "version":
        # Find the root manuscript (parent) to attach this version to
        parent = await repo.find_by_title_and_owner(title, current_user.id)
        if not parent:
            # Fallback: maybe the title changed slightly; treat as new
            upload_mode = "new"
        else:
            next_version = await repo.get_latest_version_number(parent.id, current_user.id) + 1
            manuscript = await repo.create_version(
                owner_id=current_user.id,
                title=title,
                original_filename=file.filename or saved_path.name,
                file_path=str(saved_path),
                file_size_bytes=len(file_bytes),
                file_type=file_type,
                parent_id=parent.id,
                version_number=next_version,
                author=author,
            )
            logger.info(
                "manuscript_version_uploaded",
                user_id=current_user.id,
                manuscript_id=manuscript.id,
                version=next_version,
                parent_id=parent.id,
            )
            if auto_process:
                background_tasks.add_task(_run_processing_task, manuscript_id=manuscript.id)
            return manuscript

    # Default: create new root manuscript
    manuscript = await repo.create(
        owner_id=current_user.id,
        title=title,
        original_filename=file.filename or saved_path.name,
        file_path=str(saved_path),
        file_size_bytes=len(file_bytes),
        file_type=file_type,
        author=author,
    )
    logger.info(
        "manuscript_uploaded",
        user_id=current_user.id,
        manuscript_id=manuscript.id,
        filename=file.filename,
    )
    if auto_process:
        background_tasks.add_task(_run_processing_task, manuscript_id=manuscript.id)
    return manuscript


async def _run_processing_task(manuscript_id: str) -> None:
    """
    Background task wrapper that opens its own DB session.
    FastAPI BackgroundTasks cannot reuse the request-scoped session.
    """
    from database import get_db_context
    async with get_db_context() as db:
        await process_manuscript(manuscript_id, db)


@router.get("", response_model=ManuscriptListResponse)
async def list_manuscripts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    offset: int = 0,
):
    """List all manuscripts for the current user."""
    repo = ManuscriptRepository(db)
    manuscripts = await repo.list_by_owner(current_user.id, limit=limit, offset=offset)
    total = await repo.count_by_owner(current_user.id)
    return ManuscriptListResponse(manuscripts=manuscripts, total=total)


@router.get("/{manuscript_id}", response_model=ManuscriptResponse)
async def get_manuscript(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single manuscript by ID (must belong to current user)."""
    repo = ManuscriptRepository(db)
    manuscript = await repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")
    return manuscript


@router.post("/{manuscript_id}/process", response_model=ManuscriptResponse)
async def trigger_processing(
    manuscript_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Manually trigger processing for an uploaded manuscript."""
    repo = ManuscriptRepository(db)
    manuscript = await repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    if manuscript.status == "processing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Manuscript is already being processed.",
        )

    background_tasks.add_task(_run_processing_task, manuscript_id=manuscript_id)
    logger.info("processing_triggered", manuscript_id=manuscript_id, user_id=current_user.id)
    return manuscript


@router.get("/{manuscript_id}/versions", response_model=ManuscriptListResponse)
async def get_manuscript_versions(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return all versions of a manuscript family (the root + all versions)."""
    repo = ManuscriptRepository(db)
    manuscript = await repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    # Resolve root manuscript id
    root_id = manuscript.parent_id or manuscript.id
    versions = await repo.list_versions(root_id, current_user.id)
    return ManuscriptListResponse(manuscripts=versions, total=len(versions))


@router.get("/{manuscript_id}/revision-summary", response_model=RevisionSummaryResponse)
async def get_revision_summary(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return the revision comparison summary for a versioned manuscript."""
    ms_repo = ManuscriptRepository(db)
    manuscript = await ms_repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    revision_repo = RevisionHistoryRepository(db)
    revision = await revision_repo.get_by_manuscript(manuscript_id)
    if not revision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No revision summary available for this manuscript version.",
        )

    data = json.loads(revision.revision_summary_json)
    return RevisionSummaryResponse(**data)


@router.get("/{manuscript_id}/document")
async def get_parsed_document(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return the parsed document (extracted text and chapters) for a manuscript."""
    ms_repo = ManuscriptRepository(db)
    manuscript = await ms_repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    pd_repo = ParsedDocumentRepository(db)
    doc = await pd_repo.get_by_manuscript(manuscript_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document has not been parsed yet.",
        )

    return {
        "id": doc.id,
        "manuscript_id": doc.manuscript_id,
        "total_words": doc.total_words,
        "total_chapters": doc.total_chapters,
        "chapters": json.loads(doc.chapters_json) if doc.chapters_json else [],
        "created_at": doc.created_at.isoformat(),
    }


@router.get("/{manuscript_id}/download")
async def download_manuscript_file(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """Download the original uploaded file for a manuscript."""
    repo = ManuscriptRepository(db)
    manuscript = await repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found.")

    file_path = manuscript.file_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original file no longer available on disk.")

    # Use the original filename for the download; fallback to stored path
    filename = manuscript.original_filename or os.path.basename(file_path)
    media_type, _ = mimetypes.guess_type(filename)
    media_type = media_type or "application/octet-stream"

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type,
    )


@router.delete("/{manuscript_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manuscript(
    manuscript_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a manuscript and all its associated data."""
    repo = ManuscriptRepository(db)
    manuscript = await repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    from utils.file_utils import delete_file
    delete_file(manuscript.file_path)

    await repo.delete(manuscript)
    logger.info("manuscript_deleted", manuscript_id=manuscript_id, user_id=current_user.id)


@router.patch("/{manuscript_id}", response_model=ManuscriptResponse)
async def update_manuscript(
    manuscript_id: str,
    req: ManuscriptUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update manuscript metadata (title, author)."""
    repo = ManuscriptRepository(db)
    manuscript = await repo.get_by_id_and_owner(manuscript_id, current_user.id)
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    updated = await repo.update_metadata(manuscript, title=req.title, author=req.author)
    await db.commit()
    logger.info("manuscript_updated", manuscript_id=manuscript_id, user_id=current_user.id)
    return updated
