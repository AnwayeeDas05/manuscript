"""
Users API — /me endpoint.
"""
from typing import Annotated

from fastapi import APIRouter, Depends

from api.deps import get_current_user
from models.user import User
from schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """Return the authenticated user's profile."""
    return current_user
