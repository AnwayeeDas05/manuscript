"""
Security utilities — JWT creation/verification and password hashing.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from functools import partial
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import get_settings

settings = get_settings()

# bcrypt context for password hashing
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password (sync — do NOT call these directly from async handlers) ───────────

def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt (sync — use hash_password_async in async code)."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a bcrypt hash (sync — use verify_password_async in async code)."""
    return _pwd_context.verify(plain, hashed)


# ── Async wrappers — run bcrypt in a thread pool so the event loop is never blocked ──

async def hash_password_async(plain: str) -> str:
    """Async-safe bcrypt hashing — offloads the CPU work to a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_pwd_context.hash, plain))


async def verify_password_async(plain: str, hashed: str) -> bool:
    """Async-safe bcrypt verification — offloads the CPU work to a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_pwd_context.verify, plain, hashed))


# ── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token.

    :param subject: Usually the user ID (str).
    :param expires_delta: Override default expiry.
    """
    delta = expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire = datetime.now(tz=timezone.utc) + delta
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(tz=timezone.utc)}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and validate a JWT.

    :returns: The `sub` claim (user ID) or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload.get("sub")
    except JWTError:
        return None
