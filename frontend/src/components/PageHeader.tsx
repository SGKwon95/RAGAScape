"use client";

import { useRef, useState } from "react";

/* ─── Preset covers ──────────────────────────────────── */
const COVERS = [
  { id: "c1", style: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "c2", style: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "c3", style: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: "c4", style: "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)" },
  { id: "c5", style: "linear-gradient(to right, #fa709a 0%, #fee140 100%)" },
  { id: "c6", style: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { id: "c7", style: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { id: "c8", style: "linear-gradient(to right, #a1c4fd 0%, #c2e9fb 100%)" },
];

/* ─── Emoji options ──────────────────────────────────── */
const EMOJIS = [
  "📄","📊","📝","🗂️","⚡","🔬","🧪","💡",
  "🎯","📈","🤖","✨","🚀","🔍","💬","⚙️",
  "🌐","🧠","📌","🎨","🔧","📦","🏆","📋",
];

/* ─── Props ──────────────────────────────────────────── */
interface Props {
  defaultIcon?: string;
  defaultTitle?: string;
}

/* ─── Component ──────────────────────────────────────── */
export function PageHeader({ defaultIcon = "📄", defaultTitle = "RAG Evaluation" }: Props) {
  const [coverIdx, setCoverIdx] = useState(0);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [icon, setIcon] = useState(defaultIcon);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [coverHover, setCoverHover] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {/* ── Cover image ─────────────────────────────── */}
      <div
        className="relative h-[180px] w-full overflow-hidden"
        style={{ background: COVERS[coverIdx].style }}
        onMouseEnter={() => setCoverHover(true)}
        onMouseLeave={() => {
          setCoverHover(false);
          setShowCoverPicker(false);
        }}
      >
        {/* Cover hover controls */}
        {coverHover && (
          <div className="absolute bottom-3 right-4 flex items-center gap-2">
            <button
              onClick={() => setShowCoverPicker((v) => !v)}
              className="rounded-notion bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/30 transition-colors"
            >
              Change cover
            </button>
          </div>
        )}

        {/* Cover picker popover */}
        {showCoverPicker && (
          <div
            className="absolute bottom-12 right-4 z-30 w-56 rounded-notion border border-notion-border bg-white p-3 shadow-notion-popover"
            onMouseEnter={() => setCoverHover(true)}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-notion-text-3">
              Gradient presets
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {COVERS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setCoverIdx(i); setShowCoverPicker(false); }}
                  className={`h-10 w-full rounded-notion transition-opacity hover:opacity-90 ${
                    i === coverIdx ? "ring-2 ring-notion-blue ring-offset-1" : ""
                  }`}
                  style={{ background: c.style }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Icon + title ────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-16">
        {/* Icon */}
        <div ref={emojiRef} className="relative -mt-7 mb-3 w-fit">
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="rounded-notion p-1 text-[56px] leading-none transition-colors hover:bg-notion-hover"
            title="Change icon"
          >
            {icon}
          </button>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-notion border border-notion-border bg-white p-3 shadow-notion-popover">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-notion-text-3">
                Choose icon
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setIcon(e); setShowEmojiPicker(false); }}
                    className={`flex h-8 w-8 items-center justify-center rounded-notion text-xl transition-colors hover:bg-notion-hover ${
                      e === icon ? "bg-notion-active" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setIcon(""); setShowEmojiPicker(false); }}
                className="mt-2 w-full rounded-notion py-1 text-xs text-notion-text-3 hover:bg-notion-hover transition-colors"
              >
                Remove icon
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-2 w-full text-[40px] font-bold leading-[1.2] tracking-tight text-notion-text outline-none">
          {defaultTitle}
        </h1>

        {/* Metadata line */}
        <p className="text-sm text-notion-text-3">
          Upload a document and compare GPT, Claude & Qwen via RAGAS metrics.
        </p>
      </div>
    </div>
  );
}
