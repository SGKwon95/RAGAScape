"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvaluationOut } from "@/lib/api";

const COLORS: Record<string, string> = {
  gpt: "#22c55e",
  claude: "#f97316",
  qwen: "#3b82f6",
};

const METRICS = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "answer_relevancy", label: "Answer Relevancy" },
  { key: "context_precision", label: "Context Precision" },
  { key: "context_recall", label: "Context Recall" },
] as const;

interface Props {
  evaluations: EvaluationOut[];
}

export function EvaluationChart({ evaluations }: Props) {
  // Transform to [{metric, gpt: 0.9, claude: 0.85, qwen: 0.88}, ...]
  const data = METRICS.map(({ key, label }) => {
    const row: Record<string, string | number> = { metric: label };
    for (const ev of evaluations) {
      const val = ev[key as keyof EvaluationOut] as number | null;
      row[ev.model_provider] = val != null ? parseFloat(val.toFixed(3)) : 0;
    }
    return row;
  });

  const providers = evaluations.map((e) => e.model_provider);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">RAGAS Evaluation Scores</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => (v as number).toFixed(3)} />
          <Legend />
          {providers.map((p) => (
            <Bar key={p} dataKey={p} fill={COLORS[p] ?? "#888"} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
