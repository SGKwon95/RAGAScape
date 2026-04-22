"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isResizing = useRef(false);
  const prevWidth = useRef(DEFAULT_WIDTH);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
      if (!collapsed) prevWidth.current = newWidth;
    };

    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [collapsed]);

  const toggleCollapse = () => {
    if (collapsed) {
      setSidebarWidth(prevWidth.current);
      setCollapsed(false);
    } else {
      prevWidth.current = sidebarWidth;
      setSidebarWidth(0);
      setCollapsed(true);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-notion-bg">
      {/* ── Sidebar ─────────────────────────────────── */}
      <div
        className="relative flex-shrink-0 overflow-hidden transition-none"
        style={{ width: collapsed ? 0 : sidebarWidth }}
      >
        <div style={{ width: collapsed ? 0 : sidebarWidth }} className="h-full overflow-hidden">
          <Sidebar />
        </div>
      </div>

      {/* ── Resize handle ───────────────────────────── */}
      {!collapsed && (
        <div
          onMouseDown={startResize}
          className={`group relative w-[3px] flex-shrink-0 cursor-col-resize transition-colors duration-150 ${
            isDragging ? "bg-notion-blue" : "hover:bg-notion-blue bg-notion-border"
          }`}
        >
          {/* Wider invisible hit zone */}
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {/* ── Main area ───────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onToggleSidebar={toggleCollapse} sidebarCollapsed={collapsed} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
