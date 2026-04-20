# RAGAScape API Specification v1

Base URL: `http://localhost:8000/api/v1`

---

## 1. Upload Document

### `POST /upload`

업로드된 파일을 파싱·청킹·임베딩하여 DB에 저장합니다.

**Request** — `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF, TXT, MD (최대 50 MB) |

**Response `200`**
```json
{
  "document_id": "uuid",
  "filename": "paper.pdf",
  "file_size": 204800,
  "chunk_count": 42,
  "message": "Document uploaded and indexed successfully."
}
```

**Errors**

| Code | Reason |
|------|--------|
| 413 | 파일이 50 MB 초과 |
| 415 | 지원하지 않는 파일 형식 |

---

## 2. Start Generation

### `POST /generate`

세 모델(GPT, Claude, Qwen)에 대해 요약 또는 퀴즈 생성 잡을 백그라운드로 시작합니다.

**Request** — `application/json`

```json
{
  "document_id": "uuid",
  "task_type": "summary" | "quiz",
  "num_questions": 5
}
```

**Response `200`**
```json
{
  "job_id": "uuid",
  "document_id": "uuid",
  "task_type": "summary",
  "status": "pending",
  "message": "Processing started. Poll /api/v1/status/{job_id} for updates."
}
```

**Errors**

| Code | Reason |
|------|--------|
| 404 | document_id 없음 |
| 422 | 잘못된 task_type |

---

## 3. Poll Job Status

### `GET /status/{job_id}`

잡의 현재 상태와 결과(완료 시)를 반환합니다. 클라이언트는 2초 간격으로 폴링합니다.

**Path Params**

| Param | Type | Description |
|-------|------|-------------|
| `job_id` | UUID | `/generate` 응답의 job_id |

**Response `200`**
```json
{
  "job_id": "uuid",
  "document_id": "uuid",
  "status": "pending" | "processing" | "completed" | "failed",
  "task_type": "summary",
  "created_at": "2026-04-20T10:00:00Z",
  "updated_at": "2026-04-20T10:00:15Z",
  "error_message": null,
  "results": [
    {
      "model_provider": "gpt" | "claude" | "qwen",
      "model_name": "gpt-4o-mini",
      "task_type": "summary",
      "output": { "title": "...", "summary": "...", "key_points": ["..."] },
      "latency_ms": 1200,
      "prompt_tokens": 800,
      "completion_tokens": 350
    }
  ],
  "evaluations": []
}
```

**상태 흐름**

```
pending → processing → completed
                     ↘ failed
```

---

## 4. Run RAGAS Evaluation

### `POST /evaluate`

완료된 잡에 대해 RAGAS 지표를 계산하고 결과를 DB에 저장합니다.

**Request** — `application/json`

```json
{
  "job_id": "uuid",
  "ground_truth": "optional reference answer string"
}
```

**Response `200`**
```json
{
  "job_id": "uuid",
  "evaluations": [
    {
      "model_provider": "gpt",
      "faithfulness": 0.92,
      "answer_relevancy": 0.88,
      "context_precision": 0.85,
      "context_recall": 0.90
    },
    {
      "model_provider": "claude",
      "faithfulness": 0.95,
      "answer_relevancy": 0.91,
      "context_precision": 0.87,
      "context_recall": 0.93
    },
    {
      "model_provider": "qwen",
      "faithfulness": 0.89,
      "answer_relevancy": 0.84,
      "context_precision": 0.82,
      "context_recall": 0.87
    }
  ],
  "message": "Evaluation completed."
}
```

**Errors**

| Code | Reason |
|------|--------|
| 404 | job_id 없음 |
| 409 | 잡 상태가 completed가 아님 |

---

## 5. Health Check

### `GET /health`

```json
{ "status": "ok", "version": "0.1.0" }
```

---

## Workflow Diagram

```
Client                    API                    Background Workers
  │                        │                           │
  ├── POST /upload ────────►│ parse + embed             │
  │◄───── document_id ──────┤                           │
  │                        │                           │
  ├── POST /generate ───────►│ create job ─────────────►│ GPT + Claude + Qwen
  │◄───── job_id ───────────┤                           │   (parallel)
  │                        │                           │
  ├── GET /status/{id} ────►│                          │
  │◄──── {status: processing}                           │
  │                        │                           │
  ├── GET /status/{id} ────►│◄──── results written ─────┤
  │◄──── {status: completed, results: [...]}            │
  │                        │                           │
  ├── POST /evaluate ───────►│ RAGAS scoring             │
  │◄──── {evaluations: [...]}                           │
```
