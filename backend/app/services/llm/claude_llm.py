import time

import anthropic

from app.config import settings
from app.services.llm.base import BaseLLM, LLMResponse


class ClaudeLLM(BaseLLM):
    provider_name = "claude"
    default_model = "claude-haiku-4-5-20251001"

    def __init__(self, model: str | None = None):
        self.model = model or self.default_model
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate_summary(self, context: str, document_title: str = "") -> LLMResponse:
        prompt = self._summary_prompt(context, document_title)
        start = time.monotonic()
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        latency = int((time.monotonic() - start) * 1000)
        content = response.content[0].text if response.content else ""
        return LLMResponse(
            content=content,
            model_name=self.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
            latency_ms=latency,
            raw_output=response.model_dump(),
        )

    async def generate_quiz(self, context: str, num_questions: int = 5) -> LLMResponse:
        prompt = self._quiz_prompt(context, num_questions)
        start = time.monotonic()
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        latency = int((time.monotonic() - start) * 1000)
        content = response.content[0].text if response.content else ""
        return LLMResponse(
            content=content,
            model_name=self.model,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
            latency_ms=latency,
            raw_output=response.model_dump(),
        )

    async def embed_text(self, text: str) -> list[float]:
        # Claude does not provide a native embedding endpoint.
        # Delegate to OpenAI embeddings (shared embedding space).
        from app.services.llm.openai_llm import OpenAILLM
        return await OpenAILLM().embed_text(text)
