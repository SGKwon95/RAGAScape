"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DocumentItem } from "@/lib/api";

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

/* ─── Page ────────────────────────────────────────────── */
export default function QuizListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<keyof DocumentItem>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

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
    if (typeof va === "number" && typeof vb === "number") {
      return sortAsc ? va - vb : vb - va;
    }
    return sortAsc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  const handleSort = (col: keyof DocumentItem) => {
    if (sortCol === col) setSortAsc((v) => !v);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="min-h-full bg-notion-bg px-24 py-10">
      {/* Page title */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-4xl">💯</span>
        <h1 className="text-3xl font-bold text-notion-text">퀴즈 풀기</h1>
      </div>

      {/* Database container */}
      <div className="rounded-notion border border-notion-border bg-notion-bg shadow-notion-sm">
        {/* ── View tabs ──────────────────────────────── */}
        <div className="flex items-center gap-0 border-b border-notion-border px-4">
          <ViewTab icon={<TableIcon />} label="표 보기" active />
          <ViewTab icon={<BoardIcon />} label="보드" disabled />
        </div>

        {/* ── Toolbar ────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-notion-border px-4 py-1.5">
          <div className="flex items-center gap-1">
            <ToolbarBtn icon={<FilterIcon />} label="필터" />
            <ToolbarBtn icon={<SortIcon />} label="정렬" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-notion-text-3">{docs.length}개 항목</span>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────── */}
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
                  {/* Checkbox col */}
                  <th className="w-10 py-2 pl-4 pr-1" />
                  <ColHeader
                    label="이름"
                    col="filename"
                    current={sortCol}
                    asc={sortAsc}
                    onClick={handleSort}
                    grow
                  />
                  <ColHeader
                    label="파일 크기"
                    col="file_size"
                    current={sortCol}
                    asc={sortAsc}
                    onClick={handleSort}
                    width={110}
                  />
                  <ColHeader
                    label="청크 수"
                    col="chunk_count"
                    current={sortCol}
                    asc={sortAsc}
                    onClick={handleSort}
                    width={90}
                  />
                  <ColHeader
                    label="업로드 날짜"
                    col="created_at"
                    current={sortCol}
                    asc={sortAsc}
                    onClick={handleSort}
                    width={150}
                  />
                  {/* Add column */}
                  <th className="w-10 py-2 px-2 text-right">
                    <button className="rounded-notion p-1 text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
                      <PlusIcon size={12} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((doc) => (
                  <tr
                    key={doc.id}
                    className="group cursor-pointer border-b border-notion-border transition-colors hover:bg-notion-hover"
                    onMouseEnter={() => setHoveredRow(doc.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => router.push(`/quiz/${doc.id}`)}
                  >
                    {/* Checkbox */}
                    <td className="w-10 py-2 pl-4 pr-1">
                      <div
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-notion-divider transition-opacity ${
                          hoveredRow === doc.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2 pr-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex-shrink-0 text-base leading-none">
                          {getFileIcon(doc.filename)}
                        </span>
                        <span className="truncate font-medium text-notion-text">
                          {doc.filename}
                        </span>
                        {hoveredRow === doc.id && (
                          <span className="ml-1 flex-shrink-0 rounded-notion bg-notion-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                            퀴즈 풀기 →
                          </span>
                        )}
                      </div>
                    </td>

                    {/* File size */}
                    <td className="py-2 pr-4 text-notion-text-2">
                      {formatFileSize(doc.file_size)}
                    </td>

                    {/* Chunk count */}
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-notion-blue-bg px-2 py-0.5 text-xs font-medium text-notion-blue">
                        <ChunkIcon />
                        {doc.chunk_count}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-2 pr-4 text-notion-text-2">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Empty last col */}
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer: New button ──────────────────────── */}
        {!loading && !error && (
          <div className="border-t border-notion-border px-4 py-2">
            <button className="flex items-center gap-1.5 rounded-notion px-2 py-1 text-sm text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
              <PlusIcon size={13} />
              <span>새 문서</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function ViewTab({
  icon,
  label,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
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

function ToolbarBtn({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex items-center gap-1.5 rounded-notion px-2 py-1 text-xs text-notion-text-3 transition-colors hover:bg-notion-hover hover:text-notion-text-2">
      {icon}
      {label}
    </button>
  );
}

function ColHeader({
  label,
  col,
  current,
  asc,
  onClick,
  grow,
  width,
}: {
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
    <th
      className={grow ? "py-2 pr-4" : "py-2 pr-4"}
      style={width ? { width } : undefined}
    >
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
