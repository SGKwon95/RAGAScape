"use client";

import { useState } from "react";
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
      const { job_id } = await api.startGeneration({ document_id: documentId, task_type: taskType });
      const result = await api.pollJob(job_id);
      setJobResult(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStep("configure");
    }
  };

  return (
    <div className="space-y-10">
      <section className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">Document Intelligence</h1>
        <p className="mt-2 text-gray-500">
          Upload a PDF or text file — get summaries &amp; quizzes from GPT, Claude, and Qwen, then compare them with RAGAS.
        </p>
      </section>

      {/* Step 1: Upload */}
      {step === "upload" && <FileUpload onUploaded={handleUpload} />}

      {/* Step 2: Configure */}
      {(step === "configure" || error) && (
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Choose task</h2>
          <div className="flex gap-4">
            {(["summary", "quiz"] as TaskType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTaskType(t)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  taskType === t
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-gray-200 hover:border-brand-300"
                }`}
              >
                {t === "summary" ? "Summarise" : "Quiz"}
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            onClick={handleStart}
            className="mt-6 w-full rounded-xl bg-brand-600 px-6 py-3 text-white font-semibold hover:bg-brand-500 transition"
          >
            Run all 3 models
          </button>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === "processing" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-gray-500">Running GPT, Claude, and Qwen in parallel...</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === "done" && jobResult && (
        <JobDashboard job={jobResult} onReset={() => { setStep("upload"); setJobResult(null); setDocumentId(null); }} />
      )}
    </div>
  );
}
