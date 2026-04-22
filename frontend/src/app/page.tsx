"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { FileUpload } from "@/components/FileUpload";
import { JobDashboard } from "@/components/JobDashboard";
import type { JobStatusResponse, TaskType } from "@/lib/api";
import { api } from "@/lib/api";

type Step = "upload" | "configure" | "processing" | "done";

export default function HomePage() {
  const [step, setStep] = useState<Step>("upload");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<TaskType>("summary");
  const [jobResult, setJobResult] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (docId: string) => {
    setDocumentId(docId);
    setStep("configure");
  };

  const handleStart = async () => {
    if (!documentId) return;
    setError(null);
    setStep("processing");
    try {
      const { job_id } = await api.startGeneration({
        document_id: documentId,
        task_type: taskType,
      });
      const result = await api.pollJob(job_id);
      setJobResult(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStep("configure");
    }
  };

  return (
    <div className="min-h-full pb-20">
      {/* Cover + icon + title */}
      <PageHeader defaultIcon="📄" defaultTitle="RAG Evaluation" />

      {/* Page body */}
      <div className="mx-auto max-w-3xl px-16 pt-8">
        {/* ── Properties table ─────────────────────── */}
        <div className="mb-8 space-y-0.5">
          <PropRow label="Status">
            <StatusBadge step={step} />
          </PropRow>
          <PropRow label="Task">
            <span className="text-sm text-notion-text-2">
              {taskType === "summary" ? "Summarise" : "Quiz"}
            </span>
          </PropRow>
          <PropRow label="Models">
            <div className="flex gap-1.5">
              {["GPT-4o mini", "Claude Haiku", "Qwen Plus"].map((m) => (
                <span
                  key={m}
                  className="rounded-notion bg-notion-hover px-2 py-0.5 text-xs text-notion-text-2"
                >
                  {m}
                </span>
              ))}
            </div>
          </PropRow>
          <PropRow label="Metrics">
            <span className="text-sm text-notion-text-3">
              Faithfulness · Relevancy · Precision · Recall
            </span>
          </PropRow>
        </div>

        {/* ── Divider ──────────────────────────────── */}
        <div className="mb-8 border-t border-notion-border" />

        {/* ── Step 1: Upload ───────────────────────── */}
        {step === "upload" && <FileUpload onUploaded={handleUpload} />}

        {/* ── Step 2: Configure ────────────────────── */}
        {step === "configure" && (
          <div className="space-y-5">
            <BlockHeading>Choose task type</BlockHeading>
            <div className="flex gap-2">
              {(["summary", "quiz"] as TaskType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTaskType(t)}
                  className={`flex items-center gap-2 rounded-notion border px-4 py-2.5 text-sm transition-colors duration-75 ${
                    taskType === t
                      ? "border-notion-blue bg-notion-blue-bg text-notion-blue font-medium"
                      : "border-notion-border text-notion-text-2 hover:bg-notion-hover"
                  }`}
                >
                  <span>{t === "summary" ? "📝" : "🎯"}</span>
                  {t === "summary" ? "Summarise" : "Quiz"}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-notion border border-notion-red/30 bg-notion-red-bg px-3 py-2.5 text-sm text-notion-red">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button onClick={handleStart} className="n-btn-primary">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M3 2l8 4.5L3 11V2z" fill="currentColor" />
              </svg>
              Run all 3 models
            </button>
          </div>
        )}

        {/* ── Step 3: Processing ───────────────────── */}
        {step === "processing" && (
          <div className="space-y-4">
            <BlockHeading>Running models…</BlockHeading>
            <div className="rounded-notion border border-notion-border p-4">
              <div className="flex items-center gap-3">
                <Spinner />
                <div>
                  <p className="text-sm text-notion-text">
                    Running GPT-4o mini, Claude Haiku, and Qwen Plus in parallel
                  </p>
                  <p className="mt-0.5 text-xs text-notion-text-3">
                    This usually takes 15–30 seconds
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { name: "GPT-4o mini", color: "border-t-notion-green" },
                { name: "Claude Haiku", color: "border-t-notion-orange" },
                { name: "Qwen Plus", color: "border-t-notion-blue" },
              ].map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 rounded-notion px-3 py-2 text-sm text-notion-text-2 hover:bg-notion-hover"
                >
                  <div
                    className={`h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-notion-border ${m.color}`}
                  />
                  {m.name}
                  <span className="ml-auto text-xs text-notion-text-3">In progress</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Results ──────────────────────── */}
        {step === "done" && jobResult && (
          <JobDashboard
            job={jobResult}
            onReset={() => {
              setStep("upload");
              setJobResult(null);
              setDocumentId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────── */
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[28px] items-center gap-2">
      <span className="w-28 flex-shrink-0 text-xs text-notion-text-3">{label}</span>
      {children}
    </div>
  );
}

function StatusBadge({ step }: { step: Step }) {
  const map: Record<Step, { label: string; cls: string }> = {
    upload:     { label: "Not started",  cls: "bg-notion-hover text-notion-text-3" },
    configure:  { label: "Configuring",  cls: "bg-notion-blue-bg text-notion-blue" },
    processing: { label: "Processing…",  cls: "bg-notion-orange-bg text-notion-orange" },
    done:       { label: "Completed",    cls: "bg-notion-green-bg text-notion-green" },
  };
  const { label, cls } = map[step];
  return (
    <span className={`rounded-notion px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-notion-text">{children}</h2>
  );
}

function Spinner() {
  return (
    <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-notion-border border-t-notion-blue" />
  );
}
