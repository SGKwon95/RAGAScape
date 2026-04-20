from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import EvaluateRequest, EvaluateResponse, EvaluationOut
from app.models.database import get_db
from app.models.schemas import DocumentChunk, GenerationResult, ProcessingJob
from app.services.evaluation import EvaluationService

router = APIRouter()


@router.post("", response_model=EvaluateResponse)
async def evaluate_job(
    body: EvaluateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run RAGAS evaluation on all generation results for a completed job."""
    job = await db.get(ProcessingJob, body.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != "completed":
        raise HTTPException(status_code=409, detail=f"Job status is '{job.status}', must be 'completed'.")

    # Fetch context chunks for the document
    chunks_stmt = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == job.document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = (await db.execute(chunks_stmt)).scalars().all()
    context_texts = [c.content for c in chunks]

    # Load generation results
    gr_stmt = select(GenerationResult).where(GenerationResult.job_id == body.job_id)
    gen_results = (await db.execute(gr_stmt)).scalars().all()

    svc = EvaluationService(db)
    evaluations = []
    for gr in gen_results:
        ev = await svc.evaluate_result(gr, context_texts, body.ground_truth)
        evaluations.append(
            EvaluationOut(
                model_provider=ev.model_provider,
                faithfulness=ev.faithfulness,
                answer_relevancy=ev.answer_relevancy,
                context_precision=ev.context_precision,
                context_recall=ev.context_recall,
            )
        )

    return EvaluateResponse(job_id=body.job_id, evaluations=evaluations)
