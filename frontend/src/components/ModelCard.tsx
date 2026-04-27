"use client";

import type { EvaluationOut, ModelProvider, TaskType } from "@/lib/api";

const ACCENT: Record<ModelProvider, { tag: string; bar: string; score: string }> = {
  gpt:    { tag: "bg-notion-green-bg text-notion-green",   bar: "#0f7b6c", score: "text-notion-green"   },
  claude: { tag: "bg-notion-orange-bg text-notion-orange", bar: "#c76b15", score: "text-notion-orange" },
  qwen:   { tag: "bg-notion-blue-bg text-notion-blue",     bar: "#2383e2", score: "text-notion-blue"   },
  gemini: { tag: "bg-purple-100 text-purple-700",          bar: "#7c3aed", score: "text-purple-700"    },
};

interface Props {
  label: string;
  provider: ModelProvider;
  taskType: TaskType;
  output: Record<string, unknown>;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  evaluation?: EvaluationOut;
}

export function ModelCard({
  label,
  provider,
  taskType,
  output,
  latencyMs,
  promptTokens,
  completionTokens,
  evaluation,
}: Props) {
  const accent = ACCENT[provider];
  const scores: [string, number | null][] = evaluation
    ? [
        ["Faithfulness", evaluation.faithfulness],
        ["Relevancy",    evaluation.answer_relevancy],
        ["Precision",    evaluation.context_precision],
        ["Recall",       evaluation.context_recall],
      ]
    : [];

  return (
    <div className="flex flex-col overflow-hidden rounded-notion border border-notion-border bg-white transition-colors hover:border-notion-divider">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-notion-border px-3 py-2.5">
        <span className={`rounded-notion px-2 py-0.5 text-xs font-semibold ${accent.tag}`}>
          {label}
        </span>
        {latencyMs != null && (
          <span className="text-xs text-notion-text-3">{(latencyMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-3">
        {taskType === "summary" ? (
          <SummaryView output={output} />
        ) : (
          <QuizView output={output} />
        )}
      </div>

      {/* Token row */}
      {(promptTokens != null || completionTokens != null) && (
        <div className="border-t border-notion-border px-3 py-2">
          <p className="text-xs text-notion-text-3">
            {promptTokens ?? "—"} in · {completionTokens ?? "—"} out tokens
          </p>
        </div>
      )}

      {/* RAGAS scores */}
      {scores.length > 0 && (
        <div className="border-t border-notion-border px-3 py-3 space-y-2">
          {scores.map(([name, val]) => (
            <ScoreBar key={name} name={name} value={val} barColor={accent.bar} scoreClass={accent.score} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Score bar ──────────────────────────────────────── */
function ScoreBar({
  name,
  value,
  barColor,
  scoreClass,
}: {
  name: string;
  value: number | null;
  barColor: string;
  scoreClass: string;
}) {
  const pct = value != null ? Math.round(value * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-notion-text-3">{name}</span>
        <span className={`text-xs font-semibold tabular-nums ${scoreClass}`}>
          {value != null ? value.toFixed(2) : "—"}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-notion-hover">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

/* ─── Content views ──────────────────────────────────── */
function str(val: unknown): string {
  return typeof val === "string" ? val : String(val ?? "");
}

function SummaryView({ output }: { output: Record<string, unknown> }) {
  const keyPoints = Array.isArray(output.key_points)
    ? (output.key_points as unknown[]).slice(0, 4).map(str)
    : [];

  return (
    <div className="space-y-2">
      {!!output.title && (
        <p className="text-xs font-semibold text-notion-text">{str(output.title)}</p>
      )}
      <p className="line-clamp-6 text-xs leading-relaxed text-notion-text-2">
        {str(output.summary)}
      </p>
      {keyPoints.length > 0 && (
        <ul className="space-y-1">
          {keyPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-notion-text-3">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-notion-divider" />
              {pt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

function isQuizQuestion(v: unknown): v is QuizQuestion {
  if (typeof v !== "object" || v === null) return false;
  return "question" in v && "options" in v && "correct_answer" in v;
}

function QuizView({ output }: { output: Record<string, unknown> }) {
  const questions = Array.isArray(output.questions)
    ? (output.questions as unknown[]).filter(isQuizQuestion)
    : [];

  return (
    <div className="space-y-3">
      {questions.slice(0, 2).map((q, i) => (
        <div key={i} className="space-y-1.5">
          <p className="text-xs font-medium text-notion-text">
            Q{i + 1}. {q.question}
          </p>
          <ul className="ml-2 space-y-0.5">
            {q.options.map((opt) => {
              const correct = opt.startsWith(q.correct_answer);
              return (
                <li
                  key={opt}
                  className={`flex items-center gap-1.5 text-xs ${
                    correct ? "font-medium text-notion-green" : "text-notion-text-3"
                  }`}
                >
                  {correct && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {opt}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {questions.length > 2 && (
        <p className="text-xs text-notion-text-3">+{questions.length - 2} more questions</p>
      )}
    </div>
  );
}
