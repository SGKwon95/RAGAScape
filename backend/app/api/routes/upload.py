from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import UploadResponse
from app.config import settings
from app.models.database import get_db
from app.services.document import DocumentService

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
}


@router.post("", response_model=UploadResponse)
async def upload_document(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF or text document. Returns the document_id for subsequent calls."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    data = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    svc = DocumentService(db)
    doc = await svc.ingest(data, file.filename or "upload", file.content_type or "text/plain")

    return UploadResponse(
        document_id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        chunk_count=doc.chunk_count,
    )
