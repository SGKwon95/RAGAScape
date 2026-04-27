import time

from openai import AsyncOpenAI

from app.config import settings
from app.services.llm.base import BaseLLM, LLMResponse


class GeminiLLM(BaseLLM):
    provider_name = "gemini"

    def __init__(self, model: str | None = None):
        self.model = model or settings.GEMINI_MODEL
        self.client = AsyncOpenAI(
            api_key=settings.REMOTE_LM_API_KEY or "none",
            base_url=settings.REMOTE_LM_BASE_URL,
        )

    async def generate_summary(self, context: str, document_title: str = "") -> LLMResponse:
        prompt = self._summary_prompt(context, document_title)
        start = time.monotonic()
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        latency = int((time.monotonic() - start) * 1000)
        choice = response.choices[0]
        return LLMResponse(
            content=choice.message.content or "",
            model_name=self.model,
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            latency_ms=latency,
            raw_output=response.model_dump(),
        )

    async def generate_quiz(self, context: str, num_questions: int = 5) -> LLMResponse:
        prompt = self._quiz_prompt(context, num_questions)
        start = time.monotonic()
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        latency = int((time.monotonic() - start) * 1000)
        choice = response.choices[0]
        return LLMResponse(
            content=choice.message.content or "",
            model_name=self.model,
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            latency_ms=latency,
            raw_output=response.model_dump(),
        )

    async def embed_text(self, text: str) -> list[float]:
        from app.services.llm.openai_llm import OpenAILLM
        return await OpenAILLM().embed_text(text)
