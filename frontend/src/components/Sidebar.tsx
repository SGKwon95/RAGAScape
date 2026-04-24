"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UploadModal } from "@/components/UploadModal";

/* ─── Types ─────────────────────────────────────────── */
interface MenuItem_ {
  id: string;
  emoji: string;
  title: string;
  active?: boolean;
  action?: string;
  href?: string;
}

interface Page extends MenuItem_ {}

interface Menu extends MenuItem_ {
  children?: MenuItem_[];
}

/* ─── Dummy data ─────────────────────────────────────── */
const PAGES: Page[] = [
  {
    id: "1",
    emoji: "📃",
    title: "개인 페이지",
  },
];

const MENUS: Menu[] = [
  {
    id: "1",
    emoji: "🗂️",
    title: "문서 관리",
    children: [
      { id: "1-1", emoji: "📩", title: "문서 업로드", action: "upload" },
    ],
  },
  {
    id: "2",
    emoji: "❓",
    title: "퀴즈 관리",
    children: [{ id: "2-1", emoji: "💯", title: "퀴즈 풀기", href: "/quiz" }],
  },
  { id: "3", emoji: "📄", title: "RAG Evaluation" },
  {
    id: "4",
    emoji: "📊",
    title: "Model Benchmarks",
    children: [
      { id: "4-1", emoji: "📈", title: "GPT Performance" },
      { id: "4-2", emoji: "🤖", title: "Claude Results" },
      { id: "4-3", emoji: "🌐", title: "Qwen Analysis" },
    ],
  },
];

/* ─── Sidebar root ───────────────────────────────────── */
export function Sidebar() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleAction = (action: string, href?: string) => {
    if (action === "upload") {
      setUploadModalOpen(true);
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-notion-sidebar select-none">
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
      {/* Workspace / profile header */}
      <WorkspaceHeader />

      {/* Quick nav */}
      <div className="mt-1 px-1.5 space-y-px">
        <NavItem icon={<SearchIcon />} label="Search" />
        <NavItem icon={<HomeIcon />} label="Home" />
      </div>

      {/* Divider */}
      <Divider />

      {/* Menu */}
      <div className="overflow-y-auto px-1.5 pb-2">
        <SectionLabel label="Menu" />
        {MENUS.map((menu) => (
          <MenuItem
            key={menu.id}
            menu={menu}
            depth={0}
            pathname={pathname}
            onAction={handleAction}
          />
        ))}
      </div>

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
          A
        </div>
        <span className="flex-1 truncate text-sm font-semibold text-notion-text">
          AideNote
        </span>
      </button>
    </div>
  );
}

/* ─── PageItem ───────────────────────────────────────── */
function PageItem({ page, depth }: { page: Page; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

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
          onClick={() => {}}
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
    </div>
  );
}

/* ─── MenuItem ───────────────────────────────────────── */
function MenuItem({
  menu,
  depth,
  pathname,
  onAction,
}: {
  menu: Menu;
  depth: number;
  pathname: string;
  onAction?: (action: string, href?: string) => void;
}) {
  const hasChildren = !!menu.children?.length;
  const isActive = !hasChildren && !!menu.href && pathname.startsWith(menu.href);
  const [expanded, setExpanded] = useState(isActive);
  const [hovered, setHovered] = useState(false);

  // Auto-expand parent if a child is active
  const hasActiveChild = hasChildren && menu.children!.some(
    (c) => c.href && pathname.startsWith(c.href)
  );
  const [wasAutoExpanded] = useState(hasActiveChild);

  const handleClick = () => {
    if (hasChildren) {
      setExpanded((v) => !v);
    } else {
      onAction?.(menu.action ?? "", menu.href);
    }
  };

  return (
    <div>
      <div
        className={`group relative flex items-center rounded-notion ${
          isActive ? "bg-notion-active" : ""
        }`}
        style={{ paddingLeft: depth * 12 + 4 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Chevron toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-notion text-notion-text-3 transition-all hover:bg-notion-divider hover:text-notion-text-2 ${
              hovered || expanded || wasAutoExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`transition-transform duration-150 ${expanded || wasAutoExpanded ? "rotate-90" : ""}`}
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
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Emoji + Title */}
        <button
          className={`flex flex-1 items-center gap-1.5 overflow-hidden py-[5px] pr-1 text-sm transition-colors hover:text-notion-text ${
            isActive ? "font-medium text-notion-text" : "text-notion-text-2"
          }`}
          onClick={handleClick}
        >
          <span className="text-base leading-none">{menu.emoji}</span>
          <span className="truncate">{menu.title}</span>
        </button>
      </div>

      {/* Children */}
      {(expanded || wasAutoExpanded) && hasChildren && (
        <div>
          {menu.children!.map((child) => (
            <MenuItem
              key={child.id}
              menu={child}
              depth={depth + 1}
              pathname={pathname}
              onAction={onAction}
            />
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
function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 6.5L7 1.5l5.5 5v6a.5.5 0 01-.5.5H9V9.5H5V13H2a.5.5 0 01-.5-.5v-6z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
