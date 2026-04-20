"""RAGAS-based evaluation service for LLM generation results."""

from __future__ import annotations

import json

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import EvaluationResult, GenerationResult, ModelProvider


class EvaluationService:
    """Wraps RAGAS evaluation and persists scores to PostgreSQL."""

    METRICS = [faithfulness, answer_relevancy, context_precision, context_recall]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_result(
        self,
        generation_result: GenerationResult,
        context_chunks: list[str],
        ground_truth: str | None = None,
    ) -> EvaluationResult:
        """Run RAGAS metrics on a single GenerationResult and persist scores."""

        output = generation_result.output
        # Extract the question / answer depending on task type
        if generation_result.task_type == "summary":
            question = "Summarise the document."
            answer = output.get("summary", json.dumps(output))
        else:
            # For quiz we evaluate the first question as a proxy
            questions = output.get("questions", [])
            if questions:
                q = questions[0]
                question = q.get("question", "")
                answer = q.get("explanation", "")
            else:
                question = "Generate quiz questions."
                answer = json.dumps(output)

        ragas_dataset = Dataset.from_dict(
            {
                "question": [question],
                "answer": [answer],
                "contexts": [context_chunks],
                "ground_truth": [ground_truth or answer],
            }
        )

        result = evaluate(ragas_dataset, metrics=self.METRICS)
        scores = result.to_pandas().iloc[0].to_dict()

        evaluation = EvaluationResult(
            job_id=generation_result.job_id,
            generation_result_id=generation_result.id,
            model_provider=generation_result.model_provider,
            faithfulness=scores.get("faithfulness"),
            answer_relevancy=scores.get("answer_relevancy"),
            context_precision=scores.get("context_precision"),
            context_recall=scores.get("context_recall"),
            raw_scores=scores,
        )
        self.db.add(evaluation)
        await self.db.commit()
        await self.db.refresh(evaluation)
        return evaluation

    async def evaluate_all_providers(
        self,
        job_id: str,
        context_chunks: list[str],
        ground_truth: str | None = None,
    ) -> list[EvaluationResult]:
        """Evaluate every GenerationResult tied to a job."""
        from sqlalchemy import select
        from app.models.schemas import GenerationResult as GR

        stmt = select(GR).where(GR.job_id == job_id)
        async with self.db as session:
            rows = (await session.execute(stmt)).scalars().all()

        results: list[EvaluationResult] = []
        for gr in rows:
            ev = await self.evaluate_result(gr, context_chunks, ground_truth)
            results.append(ev)
        return results
