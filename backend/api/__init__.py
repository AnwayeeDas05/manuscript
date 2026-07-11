from api.auth import router as auth_router
from api.users import router as users_router
from api.manuscripts import router as manuscripts_router
from api.reports import router as reports_router
from api.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "users_router",
    "manuscripts_router",
    "reports_router",
    "dashboard_router",
]
