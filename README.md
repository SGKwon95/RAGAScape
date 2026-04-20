# RAGAScape

PDF/텍스트 문서를 업로드하면 GPT, Claude, Qwen 세 모델이 동시에 요약과 퀴즈를 생성하고, RAGAS로 성능을 비교하는 웹 애플리케이션입니다.

## 스택

| 영역       | 기술                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router, TypeScript, Tailwind CSS)                         |
| Backend    | FastAPI (Python 3.11)                                                     |
| Database   | PostgreSQL 16 + pgvector                                                  |
| LLM        | OpenAI GPT-4o-mini, Anthropic Claude Haiku, Alibaba Qwen Plus             |
| Evaluation | RAGAS (Faithfulness, Answer Relevancy, Context Precision, Context Recall) |
| Infra      | Docker Compose, Redis                                                     |

## 시작하기

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 및 실행 중

### 1. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 API 키를 입력합니다.

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DASHSCOPE_API_KEY=sk-...   # Alibaba Qwen
```

### 2. Docker로 전체 스택 실행

```bash
# 최초 실행 (이미지 빌드 포함)
docker compose up --build

# 이후 실행
docker compose up

# 백그라운드 실행
docker compose up -d
```

| 서비스     | URL                        |
| ---------- | -------------------------- |
| 웹 앱      | http://localhost:3000      |
| API        | http://localhost:8000      |
| Swagger UI | http://localhost:8000/docs |

### 3. 자주 쓰는 Docker 명령어

```bash
# 실행 중인 컨테이너 상태 확인
docker compose ps

# 특정 서비스 로그 확인
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# 실시간 로그 스트리밍
docker compose logs -f backend

# 컨테이너 중지
docker compose down

# 컨테이너 + 볼륨(DB 데이터) 모두 삭제
docker compose down -v
```

### 4. 로컬 개발 (Docker 없이)

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # DATABASE_URL을 로컬 PostgreSQL로 수정
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

## 사용 흐름

```
1. PDF 또는 텍스트 파일 업로드
2. 작업 선택: 요약(Summary) 또는 퀴즈(Quiz)
3. 세 모델이 병렬로 결과 생성
4. RAGAS 평가 실행 → 모델별 점수 비교 차트 확인
```

## 프로젝트 구조

```
RAGAScape/
├── backend/
│   └── app/
│       ├── api/routes/         # upload, generate, status, evaluate
│       ├── models/             # SQLAlchemy ORM (Document, Job, Result, Evaluation)
│       └── services/
│           ├── llm/            # BaseLLM 추상 인터페이스 + GPT/Claude/Qwen 구현체
│           ├── document.py     # 파싱 → 청킹 → 임베딩
│           ├── rag.py          # 3개 모델 병렬 팬아웃
│           └── evaluation.py   # RAGAS 평가 및 DB 저장
├── frontend/
│   └── src/
│       ├── app/                # Next.js App Router 페이지
│       ├── components/         # FileUpload, ModelCard, JobDashboard, EvaluationChart
│       └── lib/api.ts          # API 클라이언트 + 타입 정의
├── docker-compose.yml
└── API_SPEC.md                 # REST API 명세서
```

## API 요약

| Method | Path                      | 설명                   |
| ------ | ------------------------- | ---------------------- |
| `POST` | `/api/v1/upload`          | 문서 업로드 및 임베딩  |
| `POST` | `/api/v1/generate`        | 요약/퀴즈 생성 잡 시작 |
| `GET`  | `/api/v1/status/{job_id}` | 잡 상태 및 결과 조회   |
| `POST` | `/api/v1/evaluate`        | RAGAS 평가 실행        |

전체 명세는 [`API_SPEC.md`](./API_SPEC.md)를 참고하세요.

## 새 LLM 추가하기

`backend/app/services/llm/base.py`의 `BaseLLM`을 상속해 구현한 뒤, `__init__.py`의 `LLM_REGISTRY`에 등록합니다.

```python
# backend/app/services/llm/__init__.py
LLM_REGISTRY = {
    "gpt": OpenAILLM,
    "claude": ClaudeLLM,
    "qwen": QwenLLM,
    "gemini": GeminiLLM,  # 추가
}
```

## 라이선스

MIT
