"""Pydantic request/response schemas for the REST API."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ─────────────────────────────────────────
# Upload
# ─────────────────────────────────────────

class UploadResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    file_size: int
    chunk_count: int
    message: str = "Document uploaded and indexed successfully."


# ─────────────────────────────────────────
# Generate
# ─────────────────────────────────────────

class GenerateRequest(BaseModel):
    document_id: uuid.UUID
    task_type: str = Field(..., pattern="^(summary|quiz)$")
    num_questions: int = Field(default=5, ge=1, le=20)


class GenerateResponse(BaseModel):
    job_id: uuid.UUID
    document_id: uuid.UUID
    task_type: str
    status: str
    message: str = "Processing started. Poll /api/v1/status/{job_id} for updates."


# ─────────────────────────────────────────
# Status
# ─────────────────────────────────────────

class ModelResultOut(BaseModel):
    model_provider: str
    model_name: str
    task_type: str
    output: dict[str, Any]
    latency_ms: int | None
    prompt_tokens: int | None
    completion_tokens: int | None


class EvaluationOut(BaseModel):
    model_provider: str
    faithfulness: float | None
    answer_relevancy: float | None
    context_precision: float | None
    context_recall: float | None


class JobStatusResponse(BaseModel):
    job_id: uuid.UUID
    document_id: uuid.UUID
    status: str
    task_type: str
    created_at: datetime
    updated_at: datetime
    error_message: str | None = None
    results: list[ModelResultOut] = []
    evaluations: list[EvaluationOut] = []


# ─────────────────────────────────────────
# Evaluate
# ─────────────────────────────────────────

class EvaluateRequest(BaseModel):
    job_id: uuid.UUID
    ground_truth: str | None = None


class EvaluateResponse(BaseModel):
    job_id: uuid.UUID
    evaluations: list[EvaluationOut]
    message: str = "Evaluation completed."
