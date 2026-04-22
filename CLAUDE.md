# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAGAScape is a full-stack RAG (Retrieval-Augmented Generation) evaluation platform that simultaneously runs uploaded documents through three LLM providers (GPT, Claude, Qwen) and scores each using RAGAS metrics (Faithfulness, Answer Relevancy, Context Precision, Context Recall).

## Development Commands

### Running with Docker (recommended)
```bash
docker-compose up --build          # Start all services
docker-compose up -d               # Start in background
docker-compose down                # Stop all services
docker-compose logs -f backend     # Tail backend logs
```

### Frontend (Next.js 15)
```bash
cd frontend
npm install
npm run dev          # Dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check (no emit)
```

### Backend (FastAPI + Python 3.11)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # Dev server
```

### Environment Setup
Copy `backend/.env.example` to `backend/.env` and fill in:
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DASHSCOPE_API_KEY`
- `DATABASE_URL` (PostgreSQL with asyncpg driver)
- `REDIS_URL` (for Celery task queue)
- `NEXT_PUBLIC_API_URL=http://localhost:8000` (frontend → backend)

## Architecture

### Services (docker-compose)
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | pgvector/pgvector:pg16 | 5432 | DB + vector similarity |
| backend | FastAPI | 8000 | API + RAG orchestration |
| frontend | Next.js | 3000 | UI |
| redis | redis:7-alpine | 6379 | Celery task queue |

### Request Flow
```
Upload file (PDF/TXT/MD)
  → DocumentService: parse → chunk (1000 chars, 200 overlap) → embed (OpenAI text-embedding-3-small)
  → Stored as Document + DocumentChunk rows (embedding column: Vector(1536))

Start generation job (summary or quiz)
  → ProcessingJob created (status: PENDING)
  → RAGService: retrieve top-k chunks → build context
  → asyncio fan-out to 3 LLMs in parallel
  → Results stored as GenerationResult rows per provider

Frontend polls GET /api/v1/status/{job_id} every 2 seconds

Run RAGAS evaluation (optional, requires ground truth)
  → EvaluationService scores each GenerationResult
  → Scores stored in EvaluationResult rows
```

### Backend Structure (`backend/app/`)
- `main.py` — FastAPI app, lifespan (creates tables), CORS, route registration
- `config.py` — Pydantic settings loaded from env
- `models/schemas.py` — SQLAlchemy ORM: `Document`, `DocumentChunk`, `ProcessingJob`, `GenerationResult`, `EvaluationResult`
- `models/database.py` — Async SQLAlchemy engine and session
- `api/routes/` — `upload.py`, `generate.py`, `status.py`, `evaluate.py`
- `api/schemas.py` — Pydantic request/response models
- `services/document.py` — Ingestion: text extraction, chunking, embedding storage
- `services/rag.py` — Context retrieval (pgvector cosine similarity) + parallel LLM fan-out
- `services/evaluation.py` — RAGAS metric computation
- `services/llm/` — `base.py` (abstract `BaseLLM`), `openai_llm.py`, `claude_llm.py`, `qwen_llm.py`

### LLM Provider Pattern
All providers inherit `BaseLLM` and implement:
- `async generate_summary(context, document_title) → SummaryOutput`
- `async generate_quiz(context, num_questions) → QuizOutput`
- `async embed_text(text) → list[float]`

Registered in `services/llm/__init__.py` as `LLM_REGISTRY = {"gpt": OpenAILLM, "claude": ClaudeLLM, "qwen": QwenLLM}`.

### Frontend Structure (`frontend/src/`)
- `app/layout.tsx` — Root layout; renders `<AppShell>` (sidebar + topbar shell)
- `app/page.tsx` — Step-based workflow: upload → configure → processing → results
- `app/globals.css` — Tailwind directives + raw CSS component classes (`.n-btn`, `.n-nav-item`, etc.)
- `components/AppShell.tsx` — **Client component**; resizable sidebar (180–480 px drag handle), collapse toggle, renders `<Sidebar>` + `<TopBar>` + `{children}`
- `components/Sidebar.tsx` — Notion-style sidebar: workspace header, user profile, Search/Updates/Settings nav, page tree (expandable, hover +/⋯ actions), "Add a page" footer
- `components/TopBar.tsx` — Breadcrumb (RAGAScape › RAG Evaluation), sidebar toggle, Share/Comments/Favorites/More buttons
- `components/PageHeader.tsx` — Full-width gradient cover (8 presets, hover picker), emoji icon picker (24 options), page title
- `components/FileUpload.tsx` — Drag-and-drop file input (Notion block style)
- `components/JobDashboard.tsx` — Results grid, RAGAS evaluation trigger, optional ground truth input
- `components/ModelCard.tsx` — Per-provider result card with progress-bar RAGAS scores
- `components/EvaluationChart.tsx` — Score table (best value highlighted) + Recharts bar chart
- `lib/api.ts` — Typed API client (`uploadDocument`, `startGeneration`, `pollJob`, `evaluateJob`)

### Frontend Styling
- **Tailwind config** (`tailwind.config.ts`): custom `notion.*` color palette + `rounded-notion` (3 px) + `shadow-notion-*`
- **PostCSS config** (`postcss.config.mjs`): explicit `tailwindcss` + `autoprefixer` plugins — **required**, Next.js does not auto-detect without this file
- Google Fonts (Inter) loaded via `<link>` tag in `layout.tsx`
- Notion color tokens: `notion-bg`, `notion-sidebar`, `notion-hover`, `notion-border`, `notion-text`, `notion-text-2`, `notion-text-3`, `notion-blue`, `notion-green`, `notion-orange`, `notion-red`, `notion-purple` (+ `-bg` variants)

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/upload` | Upload document (multipart/form-data) |
| POST | `/api/v1/generate` | Start generation job |
| GET | `/api/v1/status/{job_id}` | Poll job status + results |
| POST | `/api/v1/evaluate` | Run RAGAS evaluation |
| GET | `/health` | Health check |

Full spec in `API_SPEC.md`.

## Key Data Model Notes

- `DocumentChunk.embedding` uses `pgvector` `Vector(1536)` type — requires the `vector` extension (initialized in `backend/init.sql`).
- `ProcessingJob.status` is an enum: `PENDING → PROCESSING → COMPLETED | FAILED`.
- `GenerationResult.model_provider` is an enum: `GPT | CLAUDE | QWEN`.
- `GenerationResult.output` is JSON — shape differs between summary and quiz task types.
- RAGAS evaluation requires a ground truth string provided by the user at evaluation time.
