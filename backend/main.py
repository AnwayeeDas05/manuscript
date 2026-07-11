"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.auth import router as auth_router
from api.dashboard import router as dashboard_router
from api.manuscripts import router as manuscripts_router
from api.reports import router as reports_router
from api.users import router as users_router
from config import get_settings
from database import create_tables
from utils.logger import configure_logging, get_logger

settings = get_settings()
configure_logging(debug=settings.debug)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup — create tables for SQLite dev mode."""
    logger.info("app_startup", name=settings.app_name, version=settings.app_version)
    if settings.is_sqlite:
        await create_tables()
        logger.info("sqlite_tables_created")
    yield
    logger.info("app_shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Powered Manuscript Intelligence Platform — Editorial Consistency & Review System",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
prefix = settings.api_prefix
app.include_router(auth_router, prefix=prefix)
app.include_router(users_router, prefix=prefix)
app.include_router(manuscripts_router, prefix=prefix)
app.include_router(reports_router, prefix=prefix)
app.include_router(dashboard_router, prefix=prefix)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": settings.app_version}
