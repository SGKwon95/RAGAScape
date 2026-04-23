"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import type { UploadResponse } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────── */
interface ModelOption {
  id: "gpt" | "claude" | "qwen";
  label: string;
  description: string;
  badge: string;
  color: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gpt",
    label: "GPT-4o mini",
    description: "OpenAI · Fast & cost-efficient",
    badge: "GPT",
    color: "bg-notion-green-bg text-notion-green border-notion-green/20",
  },
  {
    id: "claude",
    label: "Claude Haiku",
    description: "Anthropic · Precise reasoning",
    badge: "Claude",
    color: "bg-notion-orange-bg text-notion-orange border-notion-orange/20",
  },
  {
    id: "qwen",
    label: "Qwen Plus",
    description: "Alibaba · Multilingual strength",
    badge: "Qwen",
    color: "bg-notion-blue-bg text-notion-blue border-notion-blue/20",
  },
];

/* ─── Props ──────────────────────────────────────────── */
interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded?: (result: UploadResponse, selectedModels: string[]) => void;
}

/* ─── UploadModal ────────────────────────────────────── */
export function UploadModal({ open, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(["gpt", "claude", "qwen"])
  );
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setFile(null);
      setStatus("idle");
      setResult(null);
      setError(null);
      setSelectedModels(new Set(["gpt", "claude", "qwen"]));
    }
  }, [open]);

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleFile = useCallback((f: File) => {
    const allowed = ["application/pdf", "text/plain", "text/markdown"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|txt|md)$/i)) {
      setError("PDF, TXT, MD 파일만 지원합니다.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // at least one must be selected
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleUpload = async () => {
    if (!file || selectedModels.size === 0) return;
    setStatus("uploading");
    setError(null);
    try {
      const res = await api.uploadDocument(file);
      setResult(res);
      setStatus("success");
      onUploaded?.(res, Array.from(selectedModels));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
      setStatus("error");
    }
  };

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(15, 15, 15, 0.45)" }}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-lg rounded-[6px] bg-white shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(15,15,15,0.2), 0 0 0 1px rgba(15,15,15,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">📩</span>
            <h2 className="text-base font-semibold text-notion-text">문서 업로드</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-notion text-notion-text-3 hover:bg-notion-hover hover:text-notion-text-2 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {status === "success" && result ? (
            /* ── Success state ─────────────────────── */
            <SuccessPanel result={result} selectedModels={selectedModels} onClose={onClose} />
          ) : (
            <>
              {/* ── Drop zone ──────────────────────── */}
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-[4px] border px-6 py-8 text-center transition-colors duration-75 ${
                  status === "uploading"
                    ? "pointer-events-none opacity-60 border-notion-border"
                    : dragging
                    ? "border-notion-blue bg-notion-blue-bg"
                    : file
                    ? "border-notion-green bg-notion-green-bg"
                    : "border-dashed border-notion-border hover:border-notion-divider hover:bg-notion-hover"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-notion border transition-colors ${
                    dragging
                      ? "border-notion-blue bg-white"
                      : file
                      ? "border-notion-green/40 bg-white"
                      : "border-notion-border bg-white"
                  }`}
                >
                  {status === "uploading" ? (
                    <Spinner size={16} />
                  ) : file ? (
                    <CheckIcon />
                  ) : (
                    <UploadIcon />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-notion-text-2">
                    {status === "uploading"
                      ? "업로드 중…"
                      : file
                      ? file.name
                      : dragging
                      ? "파일을 여기에 놓으세요"
                      : "파일을 드래그하거나 클릭해서 선택"}
                  </p>
                  <p className="mt-0.5 text-xs text-notion-text-3">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB · PDF, TXT, MD`
                      : "PDF, TXT, MD 지원 · 최대 20MB"}
                  </p>
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  disabled={status === "uploading"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>

              {/* ── Model selection ─────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-notion-text-3">
                  사용할 LLM 모델
                </p>
                <div className="space-y-1.5">
                  {MODEL_OPTIONS.map((m) => {
                    const checked = selectedModels.has(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModel(m.id)}
                        className={`flex w-full items-center gap-3 rounded-notion border px-3 py-2.5 text-left transition-colors duration-75 ${
                          checked
                            ? "border-notion-blue/30 bg-notion-blue-bg"
                            : "border-notion-border hover:bg-notion-hover"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                            checked
                              ? "border-notion-blue bg-notion-blue"
                              : "border-notion-text-3 bg-white"
                          }`}
                        >
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path
                                d="M1 3.5L4 6.5L9 1"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Badge */}
                        <span
                          className={`flex-shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[11px] font-semibold ${m.color}`}
                        >
                          {m.badge}
                        </span>

                        {/* Label + desc */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-notion-text leading-tight">
                            {m.label}
                          </p>
                          <p className="text-xs text-notion-text-3">{m.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Error ───────────────────────────── */}
              {(error || status === "error") && (
                <div className="flex items-center gap-2 rounded-notion border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6.5 3.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="6.5" cy="9.2" r="0.7" fill="currentColor" />
                  </svg>
                  {error ?? "업로드 중 오류가 발생했습니다."}
                </div>
              )}

              {/* ── Actions ─────────────────────────── */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="n-btn"
                  disabled={status === "uploading"}
                >
                  취소
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || selectedModels.size === 0 || status === "uploading"}
                  className="n-btn-primary"
                >
                  {status === "uploading" ? (
                    <>
                      <Spinner size={12} />
                      업로드 중…
                    </>
                  ) : (
                    <>
                      <UploadIcon size={13} color="white" />
                      업로드 & 청킹
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ─── Success panel ──────────────────────────────────── */
function SuccessPanel({
  result,
  selectedModels,
  onClose,
}: {
  result: UploadResponse;
  selectedModels: Set<string>;
  onClose: () => void;
}) {
  const modelLabels: Record<string, string> = {
    gpt: "GPT-4o mini",
    claude: "Claude Haiku",
    qwen: "Qwen Plus",
  };

  return (
    <div className="space-y-4">
      {/* Check icon */}
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-notion-green-bg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="#0f7b6c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-notion-text">업로드 완료</p>
        <p className="mt-0.5 text-xs text-notion-text-3">{result.filename}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="청크 수" value={`${result.chunk_count}개`} />
        <StatBox label="파일 크기" value={`${(result.file_size / 1024).toFixed(1)} KB`} />
      </div>

      {/* Selected models */}
      <div>
        <p className="mb-1.5 text-xs text-notion-text-3">선택된 모델</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(selectedModels).map((id) => (
            <span
              key={id}
              className="rounded-notion bg-notion-hover px-2 py-0.5 text-xs text-notion-text-2"
            >
              {modelLabels[id] ?? id}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-notion-text-3 text-center">
        Document ID:{" "}
        <code className="rounded bg-notion-hover px-1 py-0.5 font-mono text-notion-text-2">
          {result.document_id.slice(0, 8)}…
        </code>
      </p>

      <div className="flex justify-center pt-1">
        <button onClick={onClose} className="n-btn-primary">
          확인
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-notion border border-notion-border px-3 py-2.5 text-center">
      <p className="text-base font-semibold text-notion-text">{value}</p>
      <p className="text-xs text-notion-text-3">{label}</p>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────── */
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M1 1l10 10M11 1L1 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M9 12V4M9 4L6 7M9 4l3 3"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 13.5v1A1.5 1.5 0 004.5 16h9A1.5 1.5 0 0015 14.5v-1"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-notion-green">
      <path
        d="M4 9l4 4 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="animate-spin rounded-full border-2 border-notion-border border-t-notion-blue flex-shrink-0"
    />
  );
}
