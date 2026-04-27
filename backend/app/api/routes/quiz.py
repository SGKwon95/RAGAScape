import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.schemas import Document, GenerationResult, JobStatus, ProcessingJob

router = APIRouter()


class QuizHistoryItem(BaseModel):
    job_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    model_provider: str
    model_name: str
    total_questions: int
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/history", response_model=list[QuizHistoryItem])
async def list_quiz_history(db: AsyncSession = Depends(get_db)):
    """Return all completed quiz generation results, newest first."""
    stmt = (
        select(GenerationResult, Document)
        .join(ProcessingJob, GenerationResult.job_id == ProcessingJob.id)
        .join(Document, ProcessingJob.document_id == Document.id)
        .where(ProcessingJob.task_type == "quiz")
        .where(ProcessingJob.status == JobStatus.COMPLETED)
        .order_by(GenerationResult.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()

    items: list[QuizHistoryItem] = []
    for gr, doc in rows:
        questions = gr.output.get("questions", []) if isinstance(gr.output, dict) else []
        items.append(
            QuizHistoryItem(
                job_id=gr.job_id,
                document_id=doc.id,
                filename=doc.filename,
                model_provider=gr.model_provider if isinstance(gr.model_provider, str) else gr.model_provider.value,
                model_name=gr.model_name,
                total_questions=len(questions),
                created_at=gr.created_at,
            )
        )
    return items
