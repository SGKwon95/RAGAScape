from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import upload, generate, evaluate, status, documents
from app.config import settings
from app.models.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title="RAGAScape API",
    description="Document summarization & quiz generation with multi-model RAGAS evaluation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1/upload", tags=["Upload"])
app.include_router(generate.router, prefix="/api/v1/generate", tags=["Generate"])
app.include_router(evaluate.router, prefix="/api/v1/evaluate", tags=["Evaluate"])
app.include_router(status.router, prefix="/api/v1/status", tags=["Status"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
