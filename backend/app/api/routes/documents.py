import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.schemas import Document

router = APIRouter()


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    file_size: int
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """Return all uploaded documents ordered by most recent first."""
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return result.scalars().all()
