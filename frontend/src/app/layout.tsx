import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAGAScape — Multi-model RAG Evaluation",
  description: "Upload documents, generate summaries & quizzes, compare GPT / Claude / Qwen via RAGAS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-brand-600">RAGAScape</span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">beta</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
