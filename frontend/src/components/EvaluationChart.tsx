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
  gpt:    "#0f7b6c",
  claude: "#c76b15",
  qwen:   "#2383e2",
};

const PROVIDER_LABELS: Record<string, string> = {
  gpt:    "GPT-4o mini",
  claude: "Claude Haiku",
  qwen:   "Qwen Plus",
};

const METRICS = [
  { key: "faithfulness",      label: "Faithfulness" },
  { key: "answer_relevancy",  label: "Relevancy"    },
  { key: "context_precision", label: "Precision"    },
  { key: "context_recall",    label: "Recall"       },
] as const;

interface Props {
  evaluations: EvaluationOut[];
}

export function EvaluationChart({ evaluations }: Props) {
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
    <div className="space-y-4">
      {/* Score table */}
      <div className="overflow-hidden rounded-notion border border-notion-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-notion-border bg-notion-sidebar">
              <th className="py-2 pl-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-notion-text-3 w-28">
                Metric
              </th>
              {providers.map((p) => (
                <th key={p} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-notion-text-3">
                  {PROVIDER_LABELS[p] ?? p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key, label }, idx) => {
              const values = evaluations.map((ev) => ({
                provider: ev.model_provider,
                val: ev[key as keyof EvaluationOut] as number | null,
              }));
              const best = values.reduce<number | null>(
                (acc, v) => (v.val != null && (acc == null || v.val > acc) ? v.val : acc),
                null
              );

              return (
                <tr
                  key={key}
                  className={`border-b border-notion-border last:border-0 ${
                    idx % 2 === 1 ? "bg-notion-sidebar/40" : ""
                  }`}
                >
                  <td className="py-2.5 pl-3 pr-4 text-xs font-medium text-notion-text-2">
                    {label}
                  </td>
                  {values.map(({ provider, val }) => (
                    <td key={provider} className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full bg-notion-hover">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${val != null ? val * 100 : 0}%`,
                              backgroundColor: COLORS[provider] ?? "#888",
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-semibold tabular-nums"
                          style={{
                            color:
                              val === best && val != null
                                ? COLORS[provider]
                                : "#9b9a97",
                          }}
                        >
                          {val != null ? val.toFixed(2) : "—"}
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bar chart */}
      <div className="rounded-notion border border-notion-border bg-white p-5">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-notion-text-3">
          Score comparison
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" vertical={false} />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "#9b9a97" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: "#9b9a97" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #e9e9e7",
                borderRadius: "3px",
                fontSize: 12,
                color: "#37352f",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              cursor={{ fill: "#f7f6f3" }}
              formatter={(v, name) => [
                (v as number).toFixed(3),
                PROVIDER_LABELS[name as string] ?? name,
              ]}
            />
            <Legend
              formatter={(val) => (
                <span style={{ fontSize: 11, color: "#787672" }}>
                  {PROVIDER_LABELS[val] ?? val}
                </span>
              )}
            />
            {providers.map((p) => (
              <Bar
                key={p}
                dataKey={p}
                fill={COLORS[p] ?? "#888"}
                radius={[2, 2, 0, 0]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
