"""RAG orchestration: retrieve context and fan-out to all LLM providers."""

from __future__ import annotations

import asyncio
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import (
    DocumentChunk,
    GenerationResult,
    ModelProvider,
    ProcessingJob,
)
from app.services.document import DocumentService
from app.services.llm import get_llm


class RAGService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.doc_service = DocumentService(db)

    async def run_job(self, job: ProcessingJob) -> list[GenerationResult]:
        """Retrieve context for job.document, then call all three LLMs in parallel."""
        # Load chunks
        stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == job.document_id)
            .order_by(DocumentChunk.chunk_index)
        )
        chunks = (await self.db.execute(stmt)).scalars().all()
        context = self.doc_service.get_context(chunks)
        context_texts = [c.content for c in chunks]

        # Fan-out to all providers concurrently
        tasks = {
            ModelProvider.GPT: self._call_llm("gpt", job, context),
            ModelProvider.CLAUDE: self._call_llm("claude", job, context),
            ModelProvider.QWEN: self._call_llm("qwen", job, context),
        }
        responses = await asyncio.gather(*tasks.values(), return_exceptions=True)

        results: list[GenerationResult] = []
        for provider, response in zip(tasks.keys(), responses):
            if isinstance(response, Exception):
                # Log and continue; don't let one failure abort all
                print(f"[RAG] {provider} failed: {response}")
                continue
            gr = GenerationResult(
                job_id=job.id,
                model_provider=provider,
                model_name=response.model_name,
                task_type=job.task_type,
                output=json.loads(response.content) if response.content else {},
                latency_ms=response.latency_ms,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
            )
            self.db.add(gr)
            results.append(gr)

        await self.db.commit()
        return results

    async def _call_llm(self, provider: str, job: ProcessingJob, context: str):
        llm = get_llm(provider)
        if job.task_type == "summary":
            return await llm.generate_summary(context, document_title=job.document.filename)
        return await llm.generate_quiz(context)
