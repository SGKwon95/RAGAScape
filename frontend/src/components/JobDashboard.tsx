"use client";

import { useState } from "react";
import { ModelCard } from "@/components/ModelCard";
import { EvaluationChart } from "@/components/EvaluationChart";
import type { JobStatusResponse } from "@/lib/api";
import { api } from "@/lib/api";

interface Props {
  job: JobStatusResponse;
  onReset: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  gpt: "GPT-4o mini",
  claude: "Claude Haiku",
  qwen: "Qwen Plus",
};

export function JobDashboard({ job, onReset }: Props) {
  const [evaluating, setEvaluating] = useState(false);
  const [evaluated, setEvaluated] = useState(job.evaluations.length > 0);
  const [evaluations, setEvaluations] = useState(job.evaluations);

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await api.evaluateJob(job.job_id) as { evaluations: typeof job.evaluations };
      setEvaluations(res.evaluations);
      setEvaluated(true);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Results — {job.task_type === "summary" ? "Summary" : "Quiz"}</h2>
        <button
          onClick={onReset}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 transition"
        >
          New document
        </button>
      </div>

      {/* Per-model cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {job.results.map((r) => (
          <ModelCard
            key={r.model_provider}
            label={PROVIDER_LABELS[r.model_provider] ?? r.model_provider}
            provider={r.model_provider}
            taskType={job.task_type}
            output={r.output}
            latencyMs={r.latency_ms}
            promptTokens={r.prompt_tokens}
            completionTokens={r.completion_tokens}
            evaluation={evaluations.find((e) => e.model_provider === r.model_provider)}
          />
        ))}
      </div>

      {/* RAGAS Evaluation */}
      {!evaluated ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="mb-4 text-gray-500">Run RAGAS evaluation to compare faithfulness, relevancy, and recall across models.</p>
          <button
            onClick={runEvaluation}
            disabled={evaluating}
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition disabled:opacity-50"
          >
            {evaluating ? "Evaluating…" : "Run RAGAS Evaluation"}
          </button>
        </div>
      ) : (
        <EvaluationChart evaluations={evaluations} />
      )}
    </div>
  );
}
