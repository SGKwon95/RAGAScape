"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  onUploaded: (documentId: string) => void;
}

export function FileUpload({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.uploadDocument(file);
        onUploaded(res.document_id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-notion-text">Upload document</h2>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group flex cursor-pointer flex-col items-center gap-3 rounded-notion border px-8 py-12 text-center transition-colors duration-75 ${
          loading
            ? "pointer-events-none opacity-60 border-notion-border"
            : dragging
            ? "border-notion-blue bg-notion-blue-bg"
            : "border-notion-border hover:border-notion-divider hover:bg-notion-hover"
        }`}
      >
        {/* Icon */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-notion border transition-colors ${
            dragging
              ? "border-notion-blue bg-white"
              : "border-notion-border bg-white group-hover:border-notion-divider"
          }`}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-notion-border border-t-notion-blue" />
          ) : (
            <FileIcon />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-notion-text-2">
            {loading
              ? "Uploading…"
              : dragging
              ? "Drop file to upload"
              : "Drag a file here, or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-notion-text-3">
            Supports PDF, TXT, MD
          </p>
        </div>

        <input
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-notion border border-notion-red/30 bg-notion-red-bg px-3 py-2 text-sm text-notion-red">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M6.5 3.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6.5" cy="9.2" r="0.7" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-notion-text-3">
      <rect x="2" y="1.5" width="10" height="13" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 1.5l3.5 3.5V15a1 1 0 01-1 1H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 1.5v3.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
