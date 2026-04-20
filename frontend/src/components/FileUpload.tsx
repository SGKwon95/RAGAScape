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
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`mx-auto flex max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition ${
        dragging ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 text-2xl">
        📄
      </div>
      <div>
        <p className="font-semibold text-gray-700">Drag &amp; drop a PDF or text file</p>
        <p className="text-sm text-gray-400">or click to browse</p>
      </div>

      <label className="cursor-pointer rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition">
        {loading ? "Uploading…" : "Select file"}
        <input
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          disabled={loading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
