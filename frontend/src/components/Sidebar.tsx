"use client";

import { useState } from "react";

/* ─── Types ─────────────────────────────────────────── */
interface Page {
  id: string;
  emoji: string;
  title: string;
  active?: boolean;
  children?: Page[];
}

/* ─── Dummy data ─────────────────────────────────────── */
const PAGES: Page[] = [
  { id: "1", emoji: "📄", title: "RAG Evaluation", active: true },
  {
    id: "2",
    emoji: "📊",
    title: "Model Benchmarks",
    children: [
      { id: "2-1", emoji: "📈", title: "GPT Performance" },
      { id: "2-2", emoji: "🤖", title: "Claude Results" },
      { id: "2-3", emoji: "🌐", title: "Qwen Analysis" },
    ],
  },
  { id: "3", emoji: "📝", title: "Research Notes" },
  { id: "4", emoji: "🗂️", title: "Document Library" },
];

/* ─── Sidebar root ───────────────────────────────────── */
export function Sidebar() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-notion-sidebar select-none">
      {/* Workspace / profile header */}
      <WorkspaceHeader />

      {/* Quick nav */}
      <div className="mt-1 px-1.5 space-y-px">
        <NavItem icon={<SearchIcon />} label="Search" shortcut="⌘K" />
        <NavItem icon={<UpdatesIcon />} label="Updates" />
        <NavItem icon={<SettingsIcon />} label="Settings & members" />
      </div>

      {/* Divider */}
      <Divider />

      {/* Pages */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        <SectionLabel label="Pages" />
        {PAGES.map((page) => (
          <PageItem key={page.id} page={page} depth={0} />
        ))}
      </div>

      {/* Bottom: Add page */}
      <div className="border-t border-notion-border px-1.5 py-2">
        <button className="n-nav-item w-full text-notion-text-3 hover:text-notion-text-2">
          <PlusIcon size={15} />
          Add a page
        </button>
      </div>
    </div>
  );
}

/* ─── WorkspaceHeader ────────────────────────────────── */
function WorkspaceHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="px-2 pt-3 pb-1">
      {/* Workspace row */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-notion px-2 py-1.5 hover:bg-notion-hover transition-colors"
      >
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] bg-notion-text text-white text-[11px] font-bold">
          R
        </div>
        <span className="flex-1 truncate text-sm font-semibold text-notion-text">
          RAGAScape
        </span>
      </button>

      {/* User row */}
      <div className="mt-0.5 flex items-center gap-2 rounded-notion px-2 py-1 hover:bg-notion-hover transition-colors cursor-pointer">
        {/* Avatar */}
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-blue-400 text-[11px] font-semibold text-white">
          S
        </div>
        <span className="flex-1 truncate text-xs text-notion-text-2">
          SGKwon95
        </span>
        <button
          className="rounded-notion p-0.5 text-notion-text-3 hover:bg-notion-divider hover:text-notion-text-2 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsIcon size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── PageItem ───────────────────────────────────────── */
function PageItem({ page, depth }: { page: Page; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasChildren = !!page.children?.length;

  return (
    <div>
      <div
        className={`group relative flex items-center rounded-notion ${
          page.active ? "n-nav-item-active bg-notion-hover" : ""
        }`}
        style={{ paddingLeft: depth * 12 + 4 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Chevron toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-notion text-notion-text-3 transition-all hover:bg-notion-divider hover:text-notion-text-2 ${
            hovered || expanded ? "opacity-100" : "opacity-0"
          }`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          >
            <path
              d="M3 2l4 3-4 3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Emoji + Title */}
        <button
          className="flex flex-1 items-center gap-1.5 overflow-hidden py-[5px] pr-1 text-sm text-notion-text-2 hover:text-notion-text transition-colors"
          onClick={() => hasChildren && setExpanded((v) => !v)}
        >
          <span className="text-base leading-none">{page.emoji}</span>
          <span className="truncate">{page.title}</span>
        </button>

        {/* Hover actions */}
        {hovered && (
          <div className="flex flex-shrink-0 items-center gap-0.5 pr-1">
            <button
              className="flex h-5 w-5 items-center justify-center rounded-notion text-notion-text-3 hover:bg-notion-divider hover:text-notion-text-2 transition-colors"
              title="Add nested page"
            >
              <PlusIcon size={12} />
            </button>
            <button
              className="flex h-5 w-5 items-center justify-center rounded-notion text-notion-text-3 hover:bg-notion-divider hover:text-notion-text-2 transition-colors"
              title="More"
            >
              <DotsIcon size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {page.children!.map((child) => (
            <PageItem key={child.id} page={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Small helpers ──────────────────────────────────── */
function NavItem({
  icon,
  label,
  shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}) {
  return (
    <button className="n-nav-item w-full">
      <span className="flex-shrink-0 text-notion-text-3">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <span className="text-xs text-notion-text-3">{shortcut}</span>
      )}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-0.5 mt-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-notion-text-3">
      {label}
    </p>
  );
}

function Divider() {
  return <div className="mx-3 my-1.5 border-t border-notion-border" />;
}

/* ─── SVG Icons ──────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M9.5 9.5L12.5 12.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UpdatesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5C4 1.5 1.5 4 1.5 7c0 1.5.6 2.9 1.5 3.9v1.6h1.6C5.6 13.3 6.3 13.5 7 13.5c3 0 5.5-2.5 5.5-5.5S10 1.5 7 1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4.5 7h5M7 4.5v5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M7 2v10M2 7h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DotsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="3.5" cy="7" r="1" fill="currentColor" />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function ChevronDown({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
    >
      <path
        d="M3 5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
