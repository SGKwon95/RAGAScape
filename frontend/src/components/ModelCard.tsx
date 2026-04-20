"use client";

import type { EvaluationOut, ModelProvider, TaskType } from "@/lib/api";

const PROVIDER_COLORS: Record<ModelProvider, string> = {
  gpt: "bg-green-50 border-green-200",
  claude: "bg-orange-50 border-orange-200",
  qwen: "bg-blue-50 border-blue-200",
};

const PROVIDER_BADGES: Record<ModelProvider, string> = {
  gpt: "bg-green-100 text-green-700",
  claude: "bg-orange-100 text-orange-700",
  qwen: "bg-blue-100 text-blue-700",
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

export function ModelCard({ label, provider, taskType, output, latencyMs, promptTokens, completionTokens, evaluation }: Props) {
  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${PROVIDER_COLORS[provider]}`}>
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PROVIDER_BADGES[provider]}`}>{label}</span>
        {latencyMs && (
          <span className="text-xs text-gray-400">{(latencyMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {taskType === "summary" ? (
        <SummaryView output={output} />
      ) : (
        <QuizView output={output} />
      )}

      {/* Token usage */}
      {(promptTokens != null || completionTokens != null) && (
        <p className="text-xs text-gray-400">
          Tokens: {promptTokens ?? "—"} in / {completionTokens ?? "—"} out
        </p>
      )}

      {/* Inline RAGAS scores */}
      {evaluation && (
        <div className="grid grid-cols-2 gap-1 pt-2 border-t border-gray-200">
          {[
            ["Faithfulness", evaluation.faithfulness],
            ["Relevancy", evaluation.answer_relevancy],
            ["Precision", evaluation.context_precision],
            ["Recall", evaluation.context_recall],
          ].map(([label, val]) => (
            <div key={label as string} className="text-center">
              <div className="text-xs text-gray-500">{label as string}</div>
              <div className="font-semibold text-sm">
                {val != null ? (val as number).toFixed(2) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryView({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {output.title && <p className="font-semibold text-gray-800">{output.title as string}</p>}
      <p className="text-sm text-gray-600 leading-relaxed line-clamp-6">{output.summary as string}</p>
      {Array.isArray(output.key_points) && (
        <ul className="list-disc list-inside space-y-1">
          {(output.key_points as string[]).slice(0, 4).map((pt, i) => (
            <li key={i} className="text-xs text-gray-500">{pt}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuizView({ output }: { output: Record<string, unknown> }) {
  const questions = (output.questions as Array<{
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }>) ?? [];

  return (
    <div className="space-y-3">
      {questions.slice(0, 2).map((q, i) => (
        <div key={i} className="text-sm space-y-1">
          <p className="font-medium text-gray-700">{i + 1}. {q.question}</p>
          <ul className="space-y-0.5 ml-3">
            {q.options.map((opt) => (
              <li
                key={opt}
                className={`text-xs ${opt.startsWith(q.correct_answer) ? "text-green-700 font-semibold" : "text-gray-500"}`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {questions.length > 2 && (
        <p className="text-xs text-gray-400">+{questions.length - 2} more questions</p>
      )}
    </div>
  );
}
