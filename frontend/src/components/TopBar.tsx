"use client";

import { useState } from "react";

interface Props {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function TopBar({ onToggleSidebar, sidebarCollapsed }: Props) {
  const [starred, setStarred] = useState(false);

  return (
    <header className="flex h-11 flex-shrink-0 items-center justify-between border-b border-notion-border bg-notion-bg px-3">
      {/* Left: sidebar toggle + breadcrumb */}
      <div className="flex items-center gap-1 min-w-0">
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="n-btn flex-shrink-0 text-notion-text-3 hover:text-notion-text-2"
          title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          {sidebarCollapsed ? <SidebarOpenIcon /> : <SidebarCloseIcon />}
        </button>

        {/* Breadcrumb */}
        <nav className="flex min-w-0 items-center gap-0.5 text-sm">
          <BreadcrumbItem label="RAGAScape" />
          <span className="text-notion-text-3">/</span>
          <BreadcrumbItem label="RAG Evaluation" active />
        </nav>
      </div>

      {/* Right: action buttons */}
      <div className="flex flex-shrink-0 items-center gap-0.5">
        {/* Favorites */}
        <button
          onClick={() => setStarred((v) => !v)}
          className={`n-btn transition-colors ${
            starred
              ? "text-yellow-400 hover:text-yellow-500"
              : "text-notion-text-3 hover:text-notion-text-2"
          }`}
          title={starred ? "Remove from favorites" : "Add to favorites"}
        >
          <StarIcon filled={starred} />
        </button>
      </div>
    </header>
  );
}

/* ─── Breadcrumb item ────────────────────────────────── */
function BreadcrumbItem({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`rounded-notion px-1.5 py-0.5 text-sm transition-colors hover:bg-notion-hover ${
        active ? "text-notion-text font-medium" : "text-notion-text-3"
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Icons ──────────────────────────────────────────── */
function SidebarCloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M6 1v14" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3.5 6l-1.5 2 1.5 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M6 1v14" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3.5 6l1.5 2-1.5 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7.5 9.6l-3.2 1.8.6-3.6L2.3 5.3l3.6-.5 1.6-3.3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
