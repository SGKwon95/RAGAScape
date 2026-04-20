import time

from openai import AsyncOpenAI

from app.config import settings
from app.services.llm.base import BaseLLM, LLMResponse


class OpenAILLM(BaseLLM):
    provider_name = "gpt"
    default_model = "gpt-4o-mini"

    def __init__(self, model: str | None = None):
        self.model = model or self.default_model
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

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
        response = await self.client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding
