"""Document ingestion: parse, chunk, and embed uploaded files."""

import os
import uuid
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.schemas import Document, DocumentChunk
from app.services.llm.openai_llm import OpenAILLM


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
        self.embedder = OpenAILLM()

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    async def ingest(self, file_bytes: bytes, filename: str, content_type: str) -> Document:
        """Persist file, extract text, chunk, embed, and store."""
        file_path = await self._save_file(file_bytes, filename)
        raw_text = self._extract_text(file_path, content_type)

        document = Document(
            filename=filename,
            file_path=str(file_path),
            file_size=len(file_bytes),
            content_type=content_type,
            raw_text=raw_text,
        )
        self.db.add(document)
        await self.db.flush()  # get document.id

        chunks = await self._create_chunks(document, raw_text)
        document.chunk_count = len(chunks)

        await self.db.commit()
        await self.db.refresh(document)
        return document

    def get_context(self, chunks: list[DocumentChunk], max_chars: int = 12_000) -> str:
        """Concatenate chunk content up to max_chars for LLM context."""
        parts: list[str] = []
        total = 0
        for chunk in chunks:
            if total + len(chunk.content) > max_chars:
                break
            parts.append(chunk.content)
            total += len(chunk.content)
        return "\n\n---\n\n".join(parts)

    # ------------------------------------------------------------------ #
    # Private helpers                                                      #
    # ------------------------------------------------------------------ #

    async def _save_file(self, data: bytes, filename: str) -> Path:
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        unique_name = f"{uuid.uuid4()}_{filename}"
        path = upload_dir / unique_name
        path.write_bytes(data)
        return path

    def _extract_text(self, path: Path, content_type: str) -> str:
        if content_type == "application/pdf" or path.suffix.lower() == ".pdf":
            reader = PdfReader(str(path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        return path.read_text(encoding="utf-8", errors="replace")

    async def _create_chunks(self, document: Document, text: str) -> list[DocumentChunk]:
        texts = self.splitter.split_text(text)
        chunks: list[DocumentChunk] = []
        for idx, chunk_text in enumerate(texts):
            embedding = await self.embedder.embed_text(chunk_text)
            chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=idx,
                content=chunk_text,
                embedding=embedding,
            )
            self.db.add(chunk)
            chunks.append(chunk)
        return chunks
