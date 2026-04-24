# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAGAScape is a full-stack RAG (Retrieval-Augmented Generation) evaluation platform. It uploads a document, fans out to three LLM providers (GPT-4o mini, Claude Haiku, Qwen Plus) in parallel, and scores each result using RAGAS metrics (Faithfulness, Answer Relevancy, Context Precision, Context Recall).

## Development Commands

### Docker (recommended — runs all services)
```bash
docker-compose down && docker-compose up --build   # full rebuild
docker-compose up -d                               # background
docker-compose logs -f backend                     # tail logs
```
> The frontend container uses `Dockerfile.dev` (Next.js dev server with HMR), not `Dockerfile` (production standalone build).

### Frontend only (faster iteration)
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run type-check   # tsc --noEmit
```

### Backend only
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Environment Setup
Copy `backend/.env.example` to `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://postgres.<project-ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres?prepared_statement_cache_size=0
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DASHSCOPE_API_KEY=sk-...
REDIS_URL=redis://localhost:6379/0
```
The DB is hosted on **Supabase** (Transaction Pooler). `prepared_statement_cache_size=0` is required for pooler compatibility. In Docker, `REDIS_URL` is injected automatically; only the DB URL and API keys are needed in `.env`.

## Architecture

### Services
| Service | Image/Build | Port | Notes |
|---------|------------|------|-------|
| backend | FastAPI (Dockerfile) | 8000 | runs with `--reload` in Docker |
| frontend | Next.js (Dockerfile.dev) | 3000 | HMR enabled |
| redis | redis:7-alpine | 6379 | Celery broker |

> PostgreSQL is **not** a Docker service — it runs on Supabase. The `vector` extension and all 5 tables are provisioned via Supabase migrations.

### Request Flow
```
GET  /api/v1/documents              → list all uploaded documents

POST /api/v1/upload
  → DocumentService: extract text (pdfplumber for PDF) → chunk (1000 chars, 200 overlap)
  → embed each chunk (OpenAI text-embedding-3-small, dim=1536)
  → persist Document + DocumentChunk rows

POST /api/v1/generate
  → ProcessingJob row created (PENDING)
  → BackgroundTask: asyncio.gather → 3 LLMs in parallel
  → GenerationResult row per provider (output shape differs: summary vs quiz)
  → job status → COMPLETED | FAILED

GET  /api/v1/status/{job_id}        ← frontend polls every 2 s

POST /api/v1/evaluate
  → EvaluationService: RAGAS scores per GenerationResult
  → EvaluationResult rows persisted
```

### Backend (`backend/app/`)
- `main.py` — lifespan creates all DB tables; CORS set to `*`; registers all routers under `/api/v1/`
- `config.py` — Pydantic `BaseSettings` reads from env
- `models/schemas.py` — SQLAlchemy ORM models; `DocumentChunk.embedding` is `Vector(1536)`; all `Enum` columns use `create_type=False` (Supabase manages types)
- `services/llm/` — `BaseLLM` abstract class; each provider implements `generate_summary`, `generate_quiz`, `embed_text`; registered in `__init__.py` as `LLM_REGISTRY`
- `services/document.py` — uses `pdfplumber` (not pypdf) for PDF text extraction
- `services/rag.py` — cosine similarity retrieval via pgvector, then `asyncio.gather` fan-out
- `services/evaluation.py` — wraps `ragas.evaluate()`, persists `EvaluationResult`

Key enum values: `JobStatus` (`pending/processing/completed/failed`), `ModelProvider` (`gpt/claude/qwen`).

### Frontend (`frontend/src/`)

**Shell (always rendered)**
- `app/layout.tsx` → `<AppShell>` (client component)
- `components/AppShell.tsx` — resizable sidebar (drag handle, 180–480 px, collapse toggle) + TopBar + `{children}`
- `components/Sidebar.tsx` — uses `usePathname` for active-item highlighting; menu items with `href` navigate via `useRouter`; `action: "upload"` opens `UploadModal`
- `components/TopBar.tsx` — sidebar toggle, breadcrumb, Favorites toggle

**Pages**
- `app/page.tsx` — home; step machine: `upload → configure → processing → done`; uses `FileUpload`, `JobDashboard`, `ModelCard`, `EvaluationChart`
- `app/quiz/page.tsx` — Notion database-style table of uploaded documents; clicking a row will navigate to quiz-taking for that document

**Styling**
- `postcss.config.mjs` — **must exist**; Next.js does not auto-apply Tailwind without it
- `tailwind.config.ts` — `notion.*` color palette (e.g. `notion-sidebar`, `notion-text-2`, `notion-blue-bg`), `rounded-notion` (3 px)
- `globals.css` — `@layer components` defines `.n-btn`, `.n-btn-primary`, `.n-nav-item`, `.n-nav-item-active` using raw CSS (no `@apply`) to avoid Tailwind compilation issues

## Key Gotchas

- **Supabase Enum conflict**: all `Enum` columns in SQLAlchemy models must use `create_type=False`; otherwise `create_all` tries to re-create types that Supabase already owns.
- **Pooler + asyncpg**: the `DATABASE_URL` must include `?prepared_statement_cache_size=0` when using Supabase Transaction Pooler.
- **Sidebar layout**: Menu div has no `flex-1` (sizes to content); Pages div has `flex-1` (fills rest). Don't add `flex-1` back to Menu.
- **GenerationResult.output** JSON shape: `summary` → `{title, summary, key_points[]}`, `quiz` → `{questions[{question, options[], correct_answer, explanation}]}`.
- **PDF extraction**: `pdfplumber` is used instead of `pypdf` for better Korean text extraction.
