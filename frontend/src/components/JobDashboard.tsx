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
  const [showGtInput, setShowGtInput] = useState(false);
  const [groundTruth, setGroundTruth] = useState("");

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = (await api.evaluateJob(job.job_id)) as {
        evaluations: typeof job.evaluations;
      };
      setEvaluations(res.evaluations);
      setEvaluated(true);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-notion-text">
            Results — {job.task_type === "summary" ? "Summary" : "Quiz"}
          </h2>
          <span className="rounded-notion bg-notion-green-bg px-2 py-0.5 text-xs font-medium text-notion-green">
            Completed
          </span>
        </div>
        <button onClick={onReset} className="n-btn text-xs">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 6a4.5 4.5 0 118 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9.5 9.5V7H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          New document
        </button>
      </div>

      {/* Model cards grid */}
      <div className="grid gap-3 md:grid-cols-3">
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

      {/* Divider */}
      <div className="border-t border-notion-border" />

      {/* RAGAS section */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-notion-text">RAGAS Evaluation</h2>

        {!evaluated ? (
          <div className="space-y-3">
            <p className="text-sm text-notion-text-3">
              Score each model on Faithfulness, Answer Relevancy, Context Precision, and Recall.
            </p>

            {showGtInput && (
              <textarea
                value={groundTruth}
                onChange={(e) => setGroundTruth(e.target.value)}
                placeholder="Paste ground truth (optional — improves context_recall accuracy)…"
                rows={3}
                className="w-full resize-none rounded-notion border border-notion-border bg-white px-3 py-2 text-sm text-notion-text placeholder-notion-text-3 outline-none focus:border-notion-blue transition-colors"
              />
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={runEvaluation}
                disabled={evaluating}
                className="n-btn-primary disabled:opacity-50"
              >
                {evaluating ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Evaluating…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M3 2l8 4.5L3 11V2z" fill="currentColor" />
                    </svg>
                    Run RAGAS Evaluation
                  </>
                )}
              </button>
              <button
                onClick={() => setShowGtInput((v) => !v)}
                className="n-btn text-xs"
              >
                {showGtInput ? "Hide ground truth" : "Add ground truth"}
              </button>
            </div>
          </div>
        ) : (
          <EvaluationChart evaluations={evaluations} />
        )}
      </div>
    </div>
  );
}
