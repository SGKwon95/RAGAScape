const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─────────────────────────────────────────
// Types mirroring backend Pydantic schemas
// ─────────────────────────────────────────

export type TaskType = "summary" | "quiz";
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type ModelProvider = "gpt" | "claude" | "qwen";

export interface DocumentItem {
  id: string;
  filename: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  file_size: number;
  chunk_count: number;
  message: string;
}

export interface GenerateRequest {
  document_id: string;
  task_type: TaskType;
  num_questions?: number;
}

export interface GenerateResponse {
  job_id: string;
  document_id: string;
  task_type: TaskType;
  status: JobStatus;
  message: string;
}

export interface ModelResultOut {
  model_provider: ModelProvider;
  model_name: string;
  task_type: TaskType;
  output: Record<string, unknown>;
  latency_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
}

export interface EvaluationOut {
  model_provider: ModelProvider;
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  context_recall: number | null;
}

export interface JobStatusResponse {
  job_id: string;
  document_id: string;
  status: JobStatus;
  task_type: TaskType;
  created_at: string;
  updated_at: string;
  error_message?: string;
  results: ModelResultOut[];
  evaluations: EvaluationOut[];
}

// ─────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listDocuments: (): Promise<DocumentItem[]> =>
    request("/api/v1/documents"),

  uploadDocument: async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/v1/upload`, { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`);
    }
    return res.json();
  },

  startGeneration: (body: GenerateRequest): Promise<GenerateResponse> =>
    request("/api/v1/generate", { method: "POST", body: JSON.stringify(body) }),

  getJobStatus: (jobId: string): Promise<JobStatusResponse> =>
    request(`/api/v1/status/${jobId}`),

  evaluateJob: (jobId: string, groundTruth?: string) =>
    request("/api/v1/evaluate", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, ground_truth: groundTruth }),
    }),

  /** Poll until status is 'completed' or 'failed', then resolve. */
  pollJob: (jobId: string, intervalMs = 2000): Promise<JobStatusResponse> =>
    new Promise((resolve, reject) => {
      const tick = async () => {
        try {
          const data = await api.getJobStatus(jobId);
          if (data.status === "completed" || data.status === "failed") {
            resolve(data);
          } else {
            setTimeout(tick, intervalMs);
          }
        } catch (e) {
          reject(e);
        }
      };
      tick();
    }),
};
