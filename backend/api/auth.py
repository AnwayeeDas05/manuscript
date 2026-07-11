"""
Authentication API — register and login endpoints.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from schemas.user import UserResponse
from services.auth_service import AuthService
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new user account."""
    service = AuthService(db)
    user = await service.register(
        email=str(body.email),
        username=body.username,
        full_name=body.full_name,
        password=body.password,
    )
    logger.info("user_registered", user_id=user.id, email=user.email)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate and receive a JWT access token."""
    service = AuthService(db)
    token = await service.login(email=str(body.email), password=body.password)
    logger.info("user_logged_in", email=body.email)
    return token
