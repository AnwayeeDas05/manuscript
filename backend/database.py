"""
SQLAlchemy async engine, session factory, and shared DeclarativeBase.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from config import get_settings

settings = get_settings()

# Build engine kwargs — SQLite does not support pool_size / max_overflow
_extra: dict = {}
if not settings.is_sqlite:
    _extra = {"pool_size": 10, "max_overflow": 20, "pool_pre_ping": True}

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    **_extra,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base — all ORM models inherit this."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a scoped DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for use outside FastAPI (background tasks, scripts)."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables that don't exist yet (dev convenience)."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Add new columns to existing tables for SQLite development databases
        alters = [
            "ALTER TABLE manuscripts ADD COLUMN parent_id VARCHAR(36) REFERENCES manuscripts(id) ON DELETE CASCADE;",
            "ALTER TABLE manuscripts ADD COLUMN version_number INTEGER DEFAULT 1 NOT NULL;",
            "ALTER TABLE editorial_reports ADD COLUMN critical_findings_count VARCHAR(10) DEFAULT '0';",
            "ALTER TABLE editorial_reports ADD COLUMN moderate_findings_count VARCHAR(10) DEFAULT '0';",
            "ALTER TABLE editorial_reports ADD COLUMN suggestions_count VARCHAR(10) DEFAULT '0';",
        ]
        for alter in alters:
            try:
                await conn.execute(text(alter))
            except Exception:
                # Column might already exist
                pass
