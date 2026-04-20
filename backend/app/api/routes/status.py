import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas import EvaluationOut, JobStatusResponse, ModelResultOut
from app.models.database import get_db
from app.models.schemas import EvaluationResult, GenerationResult, ProcessingJob

router = APIRouter()


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Poll the status and results of a processing job."""
    stmt = (
        select(ProcessingJob)
        .where(ProcessingJob.id == job_id)
        .options(
            selectinload(ProcessingJob.results),
            selectinload(ProcessingJob.evaluations),
        )
    )
    job = (await db.execute(stmt)).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    results_out = [
        ModelResultOut(
            model_provider=r.model_provider,
            model_name=r.model_name,
            task_type=r.task_type,
            output=r.output,
            latency_ms=r.latency_ms,
            prompt_tokens=r.prompt_tokens,
            completion_tokens=r.completion_tokens,
        )
        for r in job.results
    ]

    evals_out = [
        EvaluationOut(
            model_provider=e.model_provider,
            faithfulness=e.faithfulness,
            answer_relevancy=e.answer_relevancy,
            context_precision=e.context_precision,
            context_recall=e.context_recall,
        )
        for e in job.evaluations
    ]

    return JobStatusResponse(
        job_id=job.id,
        document_id=job.document_id,
        status=job.status,
        task_type=job.task_type,
        created_at=job.created_at,
        updated_at=job.updated_at,
        error_message=job.error_message,
        results=results_out,
        evaluations=evals_out,
    )
