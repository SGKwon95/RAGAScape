"use client";

import { useEffect, useRef, useState } from "react";
import { api, DocumentItem, ModelProvider, QuizQuestion } from "@/lib/api";

/* ─── Helpers ─────────────────────────────────────────── */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

/* ─── Quiz state types ────────────────────────────────── */
type QuizPhase = "idle" | "generating" | "ready" | "done";

/* ─── Page ────────────────────────────────────────────── */
export default function QuizListPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<keyof DocumentItem>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Quiz section state
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("gpt");
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>("idle");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const quizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .listDocuments()
      .then(setDocs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...docs].sort((a, b) => {
    const va = a[sortCol];
    const vb = b[sortCol];
    if (typeof va === "number" && typeof vb === "number")
      return sortAsc ? va - vb : vb - va;
    return sortAsc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  const handleSort = (col: keyof DocumentItem) => {
    if (sortCol === col) setSortAsc((v) => !v);
    else { setSortCol(col); setSortAsc(true); }
  };

  const handleSelectDoc = (doc: DocumentItem) => {
    if (selectedDoc?.id === doc.id) return; // already selected
    setSelectedDoc(doc);
    setQuizPhase("idle");
    setQuizQuestions([]);
    setGenError(null);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    // scroll to quiz section
    setTimeout(() => quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setQuizPhase("generating");
    setGenError(null);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    try {
      const res = await api.startGeneration({
        document_id: selectedDoc.id,
        task_type: "quiz",
        num_questions: numQuestions,
      });
      const job = await api.pollJob(res.job_id);
      if (job.status === "failed") throw new Error(job.error_message ?? "생성 실패");

      const modelResult = job.results.find((r) => r.model_provider === selectedModel);
      if (!modelResult) throw new Error(`${PROVIDER_LABELS[selectedModel]} 결과를 찾을 수 없습니다.`);

      const output = modelResult.output as { questions?: QuizQuestion[] };
      if (!output.questions?.length) throw new Error("퀴즈 문항이 없습니다.");

      setQuizQuestions(output.questions);
      setQuizPhase("ready");
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "알 수 없는 오류");
      setQuizPhase("idle");
    }
  };

  const handleAnswer = (questionIdx: number, choice: string) => {
    if (revealed[questionIdx]) return;
    setAnswers((prev) => ({ ...prev, [questionIdx]: choice }));
  };

  const handleReveal = (questionIdx: number) => {
    if (!answers[questionIdx]) return;
    setRevealed((prev) => ({ ...prev, [questionIdx]: true }));
  };

  const handleNext = () => {
    if (currentQ < quizQuestions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setQuizPhase("done");
    }
  };

  const handlePrev = () => setCurrentQ((q) => Math.max(0, q - 1));

  const handleReset = () => {
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    setQuizPhase("ready");
  };

  const score = Object.entries(revealed).filter(([idx, isRevealed]) => {
    if (!isRevealed) return false;
    const q = quizQuestions[Number(idx)];
    return answers[Number(idx)] === q?.correct_answer;
  }).length;
  const answeredCount = Object.keys(revealed).length;

  return (
    <div className="min-h-full bg-notion-bg px-24 py-10">
      {/* Page title */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-4xl">💯</span>
        <h1 className="text-3xl font-bold text-notion-text">퀴즈 풀기</h1>
      </div>

      {/* ── Document table ─────────────────────────────── */}
      <div className="rounded-notion border border-notion-border bg-notion-bg shadow-notion-sm">
        {/* View tabs */}
        <div className="flex items-center gap-0 border-b border-notion-border px-4">
          <ViewTab icon={<TableIcon />} label="표 보기" active />
          <ViewTab icon={<BoardIcon />} label="보드" disabled />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-notion-border px-4 py-1.5">
          <div className="flex items-center gap-1">
            <ToolbarBtn icon={<FilterIcon />} label="필터" />
            <ToolbarBtn icon={<SortIcon />} label="정렬" />
          </div>
          <span className="text-xs text-notion-text-3">{docs.length}개 항목</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : docs.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-notion-border bg-notion-sidebar">
                  <th className="w-10 py-2 pl-4 pr-1" />
                  <ColHeader label="이름" col="filename" current={sortCol} asc={sortAsc} onClick={handleSort} grow />
                  <ColHeader label="파일 크기" col="file_size" current={sortCol} asc={sortAsc} onClick={handleSort} width={110} />
                  <ColHeader label="청크 수" col="chunk_count" current={sortCol} asc={sortAsc} onClick={handleSort} width={90} />
                  <ColHeader label="업로드 날짜" col="created_at" current={sortCol} asc={sortAsc} onClick={handleSort} width={150} />
                  <th className="w-10 py-2 px-2 text-right">
                    <button className="rounded-notion p-1 text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
                      <PlusIcon size={12} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <tr
                      key={doc.id}
                      className={`group cursor-pointer border-b border-notion-border transition-colors ${
                        isSelected
                          ? "bg-notion-blue-bg"
                          : "hover:bg-notion-hover"
                      }`}
                      onMouseEnter={() => setHoveredRow(doc.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => handleSelectDoc(doc)}
                    >
                      {/* Checkbox */}
                      <td className="w-10 py-2 pl-4 pr-1">
                        <div
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border transition-opacity ${
                            isSelected
                              ? "border-notion-blue bg-notion-blue opacity-100"
                              : "border-notion-divider opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-2 pr-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex-shrink-0 text-base leading-none">{getFileIcon(doc.filename)}</span>
                          <span className={`truncate font-medium ${isSelected ? "text-notion-blue" : "text-notion-text"}`}>
                            {doc.filename}
                          </span>
                          {!isSelected && hoveredRow === doc.id && (
                            <span className="ml-1 flex-shrink-0 rounded-notion bg-notion-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                              퀴즈 선택 →
                            </span>
                          )}
                          {isSelected && (
                            <span className="ml-1 flex-shrink-0 rounded-notion bg-notion-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                              선택됨
                            </span>
                          )}
                        </div>
                      </td>

                      {/* File size */}
                      <td className="py-2 pr-4 text-notion-text-2">{formatFileSize(doc.file_size)}</td>

                      {/* Chunk count */}
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-notion-blue-bg px-2 py-0.5 text-xs font-medium text-notion-blue">
                          <ChunkIcon />
                          {doc.chunk_count}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2 pr-4 text-notion-text-2">{formatDate(doc.created_at)}</td>
                      <td />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="border-t border-notion-border px-4 py-2">
            <button className="flex items-center gap-1.5 rounded-notion px-2 py-1 text-sm text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
              <PlusIcon size={13} />
              <span>새 문서</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Quiz section ───────────────────────────────── */}
      {selectedDoc && (
        <div ref={quizRef} className="mt-6 space-y-4">
          {/* Generation control card */}
          <div className="rounded-notion border border-notion-border bg-notion-bg p-5 shadow-notion-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getFileIcon(selectedDoc.filename)}</span>
                <div>
                  <p className="text-xs text-notion-text-3">선택된 문서</p>
                  <p className="font-semibold text-notion-text">{selectedDoc.filename}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedDoc(null); setQuizPhase("idle"); }}
                className="rounded-notion p-1.5 text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2"
                title="닫기"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {/* Model selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-notion-text-3">모델</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ModelProvider)}
                  disabled={quizPhase === "generating"}
                  className="rounded-notion border border-notion-border bg-notion-bg px-3 py-1.5 text-sm text-notion-text focus:border-notion-blue focus:outline-none disabled:opacity-50"
                >
                  {(Object.keys(PROVIDER_LABELS) as ModelProvider[]).map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              {/* Question count */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-notion-text-3">문항 수</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  disabled={quizPhase === "generating"}
                  className="rounded-notion border border-notion-border bg-notion-bg px-3 py-1.5 text-sm text-notion-text focus:border-notion-blue focus:outline-none disabled:opacity-50"
                >
                  {[3, 5, 10].map((n) => (
                    <option key={n} value={n}>{n}문항</option>
                  ))}
                </select>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={quizPhase === "generating"}
                className="n-btn-primary"
              >
                {quizPhase === "generating" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    생성 중…
                  </>
                ) : (
                  <>
                    <SparkleIcon />
                    퀴즈 생성하기
                  </>
                )}
              </button>

              {(quizPhase === "ready" || quizPhase === "done") && (
                <button onClick={handleReset} className="n-btn">
                  다시 풀기
                </button>
              )}
            </div>

            {genError && (
              <p className="mt-3 text-sm text-red-500">{genError}</p>
            )}
          </div>

          {/* Generating skeleton */}
          {quizPhase === "generating" && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-notion border border-notion-border bg-notion-bg py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-notion-divider border-t-notion-blue" />
              <p className="text-sm text-notion-text-3">
                {PROVIDER_LABELS[selectedModel]}이(가) 퀴즈를 생성하고 있습니다…
              </p>
            </div>
          )}

          {/* Quiz cards */}
          {quizPhase === "ready" && quizQuestions.length > 0 && (
            <QuizCard
              question={quizQuestions[currentQ]}
              index={currentQ}
              total={quizQuestions.length}
              answer={answers[currentQ]}
              revealed={!!revealed[currentQ]}
              onAnswer={(choice) => handleAnswer(currentQ, choice)}
              onReveal={() => handleReveal(currentQ)}
              onPrev={handlePrev}
              onNext={handleNext}
              isLast={currentQ === quizQuestions.length - 1}
            />
          )}

          {/* Results */}
          {quizPhase === "done" && (
            <ResultCard
              total={quizQuestions.length}
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

/* ─── QuizCard ────────────────────────────────────────── */
function QuizCard({
  question,
  index,
  total,
  answer,
  revealed,
  onAnswer,
  onReveal,
  onPrev,
  onNext,
  isLast,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  answer: string | undefined;
  revealed: boolean;
  onAnswer: (choice: string) => void;
  onReveal: () => void;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const progress = ((index + 1) / total) * 100;

  return (
    <div className="rounded-notion border border-notion-border bg-notion-bg p-6 shadow-notion-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-notion-text-2">
          Q{index + 1} <span className="text-notion-text-3">/ {total}</span>
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-notion-divider">
            <div
              className="h-full rounded-full bg-notion-blue transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-notion-text-3">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question */}
      <p className="mb-5 text-base font-medium leading-relaxed text-notion-text">
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const letter = opt.charAt(0); // "A", "B", "C", "D"
          const isSelected = answer === letter;
          const isCorrect = revealed && letter === question.correct_answer;
          const isWrong = revealed && isSelected && letter !== question.correct_answer;

          return (
            <button
              key={letter}
              onClick={() => onAnswer(letter)}
              disabled={revealed}
              className={`flex w-full items-start gap-3 rounded-notion border px-4 py-3 text-left text-sm transition-colors ${
                isCorrect
                  ? "border-green-400 bg-green-50 text-green-800"
                  : isWrong
                  ? "border-red-400 bg-red-50 text-red-800"
                  : isSelected
                  ? "border-notion-blue bg-notion-blue-bg text-notion-text"
                  : "border-notion-border bg-notion-bg text-notion-text hover:border-notion-blue hover:bg-notion-blue-bg"
              } disabled:cursor-default`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  isCorrect
                    ? "border-green-500 bg-green-500 text-white"
                    : isWrong
                    ? "border-red-500 bg-red-500 text-white"
                    : isSelected
                    ? "border-notion-blue bg-notion-blue text-white"
                    : "border-notion-divider text-notion-text-3"
                }`}
              >
                {letter}
              </span>
              <span className="leading-snug">{opt.substring(3)}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="mt-4 rounded-notion bg-notion-sidebar px-4 py-3 text-sm text-notion-text-2">
          <span className="mr-1 font-semibold text-notion-text">해설:</span>
          {question.explanation}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="n-btn disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeftIcon />
          이전
        </button>

        <div className="flex gap-2">
          {!revealed && (
            <button
              onClick={onReveal}
              disabled={!answer}
              className="n-btn disabled:pointer-events-none disabled:opacity-30"
            >
              정답 확인
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!revealed}
            className="n-btn-primary disabled:pointer-events-none disabled:opacity-50"
          >
            {isLast ? "결과 보기" : "다음"}
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ResultCard ──────────────────────────────────────── */
function ResultCard({
  total,
  answered,
  score,
  onReset,
}: {
  total: number;
  answered: number;
  score: number;
  onReset: () => void;
}) {
  const pct = answered > 0 ? Math.round((score / answered) * 100) : 0;
  const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";

  return (
    <div className="rounded-notion border border-notion-border bg-notion-bg p-8 shadow-notion-sm text-center">
      <div className="text-5xl mb-3">{emoji}</div>
      <h2 className="text-2xl font-bold text-notion-text mb-1">퀴즈 완료!</h2>
      <p className="text-notion-text-2 mb-6">
        {answered}문항 중 <span className="font-semibold text-notion-text">{score}문항</span> 정답
      </p>

      <div className="flex justify-center gap-6 mb-6">
        <Stat label="정답률" value={`${pct}%`} color="text-notion-blue" />
        <Stat label="정답" value={`${score}`} color="text-green-600" />
        <Stat label="오답" value={`${answered - score}`} color="text-red-500" />
        <Stat label="전체" value={`${total}`} color="text-notion-text" />
      </div>

      <button onClick={onReset} className="n-btn-primary">
        다시 풀기
      </button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-notion-text-3">{label}</span>
    </div>
  );
}

/* ─── Sub-components (table) ──────────────────────────── */
function ViewTab({ icon, label, active, disabled }: { icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
        active
          ? "border-notion-text font-medium text-notion-text"
          : disabled
          ? "cursor-not-allowed border-transparent text-notion-text-3 opacity-50"
          : "border-transparent text-notion-text-2 hover:border-notion-divider hover:text-notion-text"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToolbarBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 rounded-notion px-2 py-1 text-xs text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
      {icon}
      {label}
    </button>
  );
}

function ColHeader({ label, col, current, asc, onClick, grow, width }: {
  label: string;
  col: keyof DocumentItem;
  current: keyof DocumentItem;
  asc: boolean;
  onClick: (col: keyof DocumentItem) => void;
  grow?: boolean;
  width?: number;
}) {
  const active = current === col;
  return (
    <th className={grow ? "py-2 pr-4" : "py-2 pr-4"} style={width ? { width } : undefined}>
      <button
        onClick={() => onClick(col)}
        className={`flex items-center gap-1 rounded-notion px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-notion-hover ${
          active ? "text-notion-text" : "text-notion-text-3"
        }`}
      >
        {label}
        <span className={`transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
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
      <p className="text-sm">문서 목록 불러오는 중…</p>
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
      <span className="text-4xl">📂</span>
      <p className="text-sm font-medium text-notion-text-2">업로드된 문서가 없습니다</p>
      <p className="text-xs">사이드바의 문서 업로드 메뉴에서 문서를 추가해 주세요.</p>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────────── */
function TableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M0.5 4.5h12M4.5 0.5v12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="0.5" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8.5" y="0.5" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4l3-3 3 3M5 1v10M7 8l3 3 3-3M10 11V1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function SortAscIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 2l4 6H1l4-6z" fill="currentColor" />
    </svg>
  );
}
function SortDescIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 8L1 2h8L5 8z" fill="currentColor" />
    </svg>
  );
}
function ChunkIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <rect x="0.5" y="0.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="5" y="0.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="0.5" y="5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="5" y="5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2M3.05 3.05l1.41 1.41M8.54 8.54l1.41 1.41M3.05 9.95l1.41-1.41M8.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M8 2.5L4.5 6.5 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M5 2.5L8.5 6.5 5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
