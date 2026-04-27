"use client";

import { QuizQuestion } from "@/lib/api";

/* ─── QuizCard ────────────────────────────────────────── */
export function QuizCard({
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
          const letter = opt.charAt(0);
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
export function ResultCard({
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
