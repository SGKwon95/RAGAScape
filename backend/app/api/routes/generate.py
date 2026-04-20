import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import GenerateRequest, GenerateResponse
from app.models.database import get_db
from app.models.schemas import Document, JobStatus, ProcessingJob
from app.services.rag import RAGService

router = APIRouter()


@router.post("", response_model=GenerateResponse)
async def start_generation(
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create a processing job and kick off background generation for all 3 LLMs."""
    # Verify document exists
    doc = await db.get(Document, body.document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    job = ProcessingJob(
        document_id=body.document_id,
        status=JobStatus.PENDING,
        task_type=body.task_type,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(_run_job, job.id, body.task_type)

    return GenerateResponse(
        job_id=job.id,
        document_id=body.document_id,
        task_type=body.task_type,
        status=JobStatus.PENDING,
    )


async def _run_job(job_id: uuid.UUID, task_type: str):
    """Background task: run RAG pipeline and update job status."""
    from app.models.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        job = await db.get(ProcessingJob, job_id)
        if job is None:
            return

        # Eagerly load related document
        doc_stmt = select(Document).where(Document.id == job.document_id)
        job.document = (await db.execute(doc_stmt)).scalar_one()

        job.status = JobStatus.PROCESSING
        await db.commit()

        try:
            svc = RAGService(db)
            await svc.run_job(job)
            job.status = JobStatus.COMPLETED
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
        finally:
            await db.commit()
