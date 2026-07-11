"""
Manuscript Pydantic schemas.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ManuscriptResponse(BaseModel):
    id: str
    owner_id: str
    title: str
    author: Optional[str]
    original_filename: str
    file_size_bytes: int
    file_type: str
    status: str
    word_count: Optional[int]
    chapter_count: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ManuscriptListResponse(BaseModel):
    manuscripts: list[ManuscriptResponse]
    total: int


class ManuscriptUpdateRequest(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
