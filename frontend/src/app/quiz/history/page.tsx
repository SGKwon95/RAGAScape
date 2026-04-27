"use client";

import { useEffect, useRef, useState } from "react";
import { api, QuizHistoryItem, ModelProvider, QuizQuestion } from "@/lib/api";
import { QuizCard, ResultCard } from "@/components/QuizPlayer";

/* ─── Helpers ─────────────────────────────────────────── */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}
function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "txt") return "📝";
  if (ext === "md") return "📋";
  return "📃";
}

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  gpt: "GPT-4o mini",
  claude: "Claude Haiku",
  qwen: "Qwen",
  gemini: "Gemini",
};
const PROVIDER_COLORS: Record<ModelProvider, string> = {
  gpt: "bg-notion-green-bg text-notion-green",
  claude: "bg-notion-orange-bg text-notion-orange",
  qwen: "bg-notion-blue-bg text-notion-blue",
  gemini: "bg-purple-100 text-purple-700",
};

type SortCol = keyof Pick<QuizHistoryItem, "filename" | "model_provider" | "total_questions" | "created_at">;
type QuizPhase = "loading" | "ready" | "done";

const rowKey = (item: QuizHistoryItem) => `${item.job_id}-${item.model_provider}`;

/* ─── Page ────────────────────────────────────────────── */
export default function QuizHistoryPage() {
  const [items, setItems] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Quiz player state
  const [selectedItem, setSelectedItem] = useState<QuizHistoryItem | null>(null);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listQuizHistory()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...items].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol];
    if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc((v) => !v);
    else { setSortCol(col); setSortAsc(true); }
  };

  const handleSelectRow = async (item: QuizHistoryItem) => {
    if (selectedItem && rowKey(selectedItem) === rowKey(item)) return;
    setSelectedItem(item);
    setQuizPhase("loading");
    setFetchError(null);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    try {
      const job = await api.getJobStatus(item.job_id);
      const result = job.results.find((r) => r.model_provider === item.model_provider);
      if (!result) throw new Error("결과를 찾을 수 없습니다.");
      const output = result.output as { questions?: QuizQuestion[] };
      if (!output.questions?.length) throw new Error("저장된 퀴즈 문항이 없습니다.");
      setQuestions(output.questions);
      setQuizPhase("ready");
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "불러오기 실패");
      setQuizPhase("loading"); // stays in loading so error is shown below
    }
  };

  const handleAnswer = (idx: number, choice: string) => {
    if (revealed[idx]) return;
    setAnswers((prev) => ({ ...prev, [idx]: choice }));
  };
  const handleReveal = (idx: number) => {
    if (!answers[idx]) return;
    setRevealed((prev) => ({ ...prev, [idx]: true }));
  };
  const handleNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ((q) => q + 1);
    else setQuizPhase("done");
  };
  const handleReset = () => { setCurrentQ(0); setAnswers({}); setRevealed({}); setQuizPhase("ready"); };

  const score = Object.entries(revealed).filter(([idx, ok]) => ok && answers[Number(idx)] === questions[Number(idx)]?.correct_answer).length;
  const answeredCount = Object.keys(revealed).length;

  return (
    <div className="min-h-full bg-notion-bg px-24 py-10">
      {/* Title */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-4xl">📋</span>
        <h1 className="text-3xl font-bold text-notion-text">퀴즈 내역</h1>
      </div>

      {/* Table */}
      <div className="rounded-notion border border-notion-border bg-notion-bg shadow-notion-sm">
        <div className="flex items-center gap-0 border-b border-notion-border px-4">
          <ViewTab icon={<TableIcon />} label="표 보기" active />
          <ViewTab icon={<BoardIcon />} label="보드" disabled />
        </div>
        <div className="flex items-center justify-between border-b border-notion-border px-4 py-1.5">
          <div className="flex items-center gap-1">
            <ToolbarBtn icon={<FilterIcon />} label="필터" />
            <ToolbarBtn icon={<SortIcon />} label="정렬" />
          </div>
          <span className="text-xs text-notion-text-3">{items.length}개 항목</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : items.length === 0 ? <EmptyState /> : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-notion-border bg-notion-sidebar">
                  <th className="w-10 py-2 pl-4 pr-1" />
                  <ColHeader label="문서 이름" col="filename" current={sortCol} asc={sortAsc} onClick={handleSort} grow />
                  <ColHeader label="모델" col="model_provider" current={sortCol} asc={sortAsc} onClick={handleSort} width={140} />
                  <ColHeader label="문항 수" col="total_questions" current={sortCol} asc={sortAsc} onClick={handleSort} width={90} />
                  <ColHeader label="생성 일시" col="created_at" current={sortCol} asc={sortAsc} onClick={handleSort} width={180} />
                  <th className="w-10 py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => {
                  const key = rowKey(item);
                  const isSelected = selectedItem ? rowKey(selectedItem) === key : false;
                  return (
                    <tr
                      key={key}
                      className={`group cursor-pointer border-b border-notion-border transition-colors ${
                        isSelected ? "bg-notion-blue-bg" : "hover:bg-notion-hover"
                      }`}
                      onMouseEnter={() => setHoveredRow(key)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => handleSelectRow(item)}
                    >
                      {/* Checkbox */}
                      <td className="w-10 py-2 pl-4 pr-1">
                        <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border transition-opacity ${
                          isSelected ? "border-notion-blue bg-notion-blue opacity-100" : "border-notion-divider opacity-0 group-hover:opacity-100"
                        }`}>
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </td>

                      {/* 문서 이름 */}
                      <td className="py-2 pr-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex-shrink-0 text-base leading-none">{getFileIcon(item.filename)}</span>
                          <span className={`truncate font-medium ${isSelected ? "text-notion-blue" : "text-notion-text"}`}>
                            {item.filename}
                          </span>
                          {!isSelected && hoveredRow === key && (
                            <span className="ml-1 flex-shrink-0 rounded-notion bg-notion-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                              풀기 →
                            </span>
                          )}
                          {isSelected && (
                            <span className="ml-1 flex-shrink-0 rounded-notion bg-notion-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                              선택됨
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 모델 */}
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PROVIDER_COLORS[item.model_provider] ?? "bg-gray-100 text-gray-600"}`}>
                          {PROVIDER_LABELS[item.model_provider] ?? item.model_provider}
                        </span>
                      </td>

                      {/* 문항 수 */}
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-notion-blue-bg px-2 py-0.5 text-xs font-medium text-notion-blue">
                          <QuizIcon />
                          {item.total_questions}문항
                        </span>
                      </td>

                      {/* 생성 일시 */}
                      <td className="py-2 pr-4 text-notion-text-2">
                        <span>{formatDate(item.created_at)}</span>
                        <span className="ml-2 text-xs text-notion-text-3">{formatTime(item.created_at)}</span>
                      </td>
                      <td />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Quiz player ──────────────────────────────────── */}
      {selectedItem && (
        <div ref={playerRef} className="mt-6 space-y-4">
          {/* Header card */}
          <div className="rounded-notion border border-notion-border bg-notion-bg px-5 py-4 shadow-notion-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFileIcon(selectedItem.filename)}</span>
                <div>
                  <p className="text-xs text-notion-text-3">퀴즈 내역 — {PROVIDER_LABELS[selectedItem.model_provider]}</p>
                  <p className="font-semibold text-notion-text">{selectedItem.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(quizPhase === "ready" || quizPhase === "done") && (
                  <button onClick={handleReset} className="n-btn">다시 풀기</button>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="rounded-notion p-1.5 text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {quizPhase === "loading" && !fetchError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-notion border border-notion-border bg-notion-bg py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-notion-divider border-t-notion-blue" />
              <p className="text-sm text-notion-text-3">퀴즈 문항 불러오는 중…</p>
            </div>
          )}

          {/* Fetch error */}
          {fetchError && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-notion border border-notion-border bg-notion-bg py-16">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-red-500">{fetchError}</p>
            </div>
          )}

          {/* Quiz card */}
          {quizPhase === "ready" && questions.length > 0 && (
            <QuizCard
              question={questions[currentQ]}
              index={currentQ}
              total={questions.length}
              answer={answers[currentQ]}
              revealed={!!revealed[currentQ]}
              onAnswer={(choice) => handleAnswer(currentQ, choice)}
              onReveal={() => handleReveal(currentQ)}
              onPrev={() => setCurrentQ((q) => Math.max(0, q - 1))}
              onNext={handleNext}
              isLast={currentQ === questions.length - 1}
            />
          )}

          {/* Result */}
          {quizPhase === "done" && (
            <ResultCard
              total={questions.length}
              answered={answeredCount}
              score={score}
              onReset={handleReset}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */
function ViewTab({ icon, label, active, disabled }: { icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
      active ? "border-notion-text font-medium text-notion-text"
      : disabled ? "cursor-not-allowed border-transparent text-notion-text-3 opacity-50"
      : "border-transparent text-notion-text-2 hover:border-notion-divider hover:text-notion-text"
    }`}>
      {icon}{label}
    </button>
  );
}
function ToolbarBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 rounded-notion px-2 py-1 text-xs text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
      {icon}{label}
    </button>
  );
}
function ColHeader({ label, col, current, asc, onClick, grow, width }: {
  label: string; col: SortCol; current: SortCol; asc: boolean;
  onClick: (col: SortCol) => void; grow?: boolean; width?: number;
}) {
  const active = current === col;
  return (
    <th className="py-2 pr-4" style={width ? { width } : undefined}>
      <button onClick={() => onClick(col)} className={`flex items-center gap-1 rounded-notion px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-notion-hover ${active ? "text-notion-text" : "text-notion-text-3"}`}>
        {label}
        <span className={`transition-opacity ${active ? "opacity-100" : "opacity-0"}`}>
          {active && asc ? <SortAscIcon /> : <SortDescIcon />}
        </span>
      </button>
    </th>
  );
}
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-notion-text-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-notion-divider border-t-notion-blue" />
      <p className="text-sm">퀴즈 내역 불러오는 중…</p>
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm font-medium text-notion-red">불러오기 실패</p>
      <p className="text-xs text-notion-text-3">{message}</p>
    </div>
  );
}
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-notion-text-3">
      <span className="text-4xl">📭</span>
      <p className="text-sm font-medium text-notion-text-2">아직 생성된 퀴즈가 없습니다</p>
      <p className="text-xs">퀴즈 풀기 메뉴에서 문서를 선택하고 퀴즈를 생성해 주세요.</p>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────────── */
function TableIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="0.5" y="0.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M0.5 4.5h12M4.5 0.5v12" stroke="currentColor" strokeWidth="1.2" /></svg>;
}
function BoardIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="0.5" y="0.5" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="8.5" y="0.5" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>;
}
function FilterIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
}
function SortIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l3-3 3 3M5 1v10M7 8l3 3 3-3M10 11V1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SortAscIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2l4 6H1l4-6z" fill="currentColor" /></svg>;
}
function SortDescIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 2h8L5 8z" fill="currentColor" /></svg>;
}
function QuizIcon() {
  return <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="4" stroke="currentColor" strokeWidth="1" /><path d="M4.5 2.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>;
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
