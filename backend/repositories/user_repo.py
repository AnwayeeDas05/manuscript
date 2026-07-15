"""
User repository — DB access layer for User model.
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from utils.security import hash_password_async


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        email: str,
        username: str,
        full_name: str,
        plain_password: str,
    ) -> User:
        user = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password=await hash_password_async(plain_password),
        )
        self.db.add(user)
        await self.db.flush()  # get generated ID without full commit
        await self.db.refresh(user)
        return user

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            setattr(user, key, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user
