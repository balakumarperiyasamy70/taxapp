from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.config import get_settings
from app.database import engine
from app.routers import auth, users, tax, loans, documents, places

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so Base picks them up, then create tables
    from app.models import user, tax_return, loan, document  # noqa: F401
    from app.database import Base
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="TaxApp API",
    description="Tax filing and refund loan platform",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_env == "development" else None,
    redoc_url=None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tax.router, prefix="/api/tax", tags=["tax"])
app.include_router(loans.router, prefix="/api/loans", tags=["loans"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(places.router, prefix="/api/places", tags=["places"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
