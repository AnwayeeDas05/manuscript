"""
Auth service — user registration and login with JWT issuance.
"""
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from repositories.user_repo import UserRepository
from schemas.auth import TokenResponse
from utils.security import create_access_token, verify_password

settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(
        self,
        email: str,
        username: str,
        full_name: str,
        password: str,
    ):
        """Create a new user. Raises 409 if email or username already taken."""
        if await self.user_repo.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )
        if await self.user_repo.get_by_username(username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken.",
            )
        return await self.user_repo.create(
            email=email,
            username=username,
            full_name=full_name,
            plain_password=password,
        )

    async def login(self, email: str, password: str) -> TokenResponse:
        """Authenticate user and return JWT token."""
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled.",
            )
        expires_seconds = settings.jwt_access_token_expire_minutes * 60
        token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
        )
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=expires_seconds,
        )
