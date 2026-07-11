"""
Manuscripts API — upload, list, get, process endpoints.
"""
from typing import Annotated

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
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from database import get_db
from models.user import User
from repositories.document_repos import ParsedDocumentRepository
from repositories.manuscript_repo import ManuscriptRepository
from schemas.manuscript import ManuscriptListResponse, ManuscriptResponse
from services.manuscript_service import process_manuscript
from utils.file_utils import save_upload, validate_upload
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/manuscripts", tags=["Manuscripts"])


@router.post("/upload", response_model=ManuscriptResponse, status_code=status.HTTP_201_CREATED)
async def upload_manuscript(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form(None),
    auto_process: bool = Form(True),
):
    """Upload a manuscript PDF or DOCX file."""
    file_bytes = await file.read()

    # Validate type and size
    try:
        validate_upload(file, len(file_bytes))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # Persist to disk
    saved_path = save_upload(file_bytes, file.filename or "manuscript")
    file_type = saved_path.suffix.lstrip(".")

    # Save metadata to DB
    repo = ManuscriptRepository(db)
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

    # Optionally kick off processing immediately
    if auto_process:
        background_tasks.add_task(
            _run_processing_task,
            manuscript_id=manuscript.id,
        )

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

    import json
    return {
        "id": doc.id,
        "manuscript_id": doc.manuscript_id,
        "total_words": doc.total_words,
        "total_chapters": doc.total_chapters,
        "chapters": json.loads(doc.chapters_json) if doc.chapters_json else [],
        "created_at": doc.created_at.isoformat(),
    }


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

    # Remove file from disk
    from utils.file_utils import delete_file
    delete_file(manuscript.file_path)

    await repo.delete(manuscript)
    logger.info("manuscript_deleted", manuscript_id=manuscript_id, user_id=current_user.id)
