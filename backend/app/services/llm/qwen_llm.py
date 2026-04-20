import json
import time

from openai import AsyncOpenAI  # DashScope is OpenAI-compatible

from app.config import settings
from app.services.llm.base import BaseLLM, LLMResponse

DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


class QwenLLM(BaseLLM):
    provider_name = "qwen"
    default_model = "qwen-plus"

    def __init__(self, model: str | None = None):
        self.model = model or self.default_model
        # DashScope exposes an OpenAI-compatible endpoint
        self.client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=DASHSCOPE_BASE_URL,
        )

    async def generate_summary(self, context: str, document_title: str = "") -> LLMResponse:
        prompt = self._summary_prompt(context, document_title)
        start = time.monotonic()
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
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
        # Use DashScope text-embedding-v3
        response = await self.client.embeddings.create(
            model="text-embedding-v3",
            input=text,
            dimensions=1536,
        )
        return response.data[0].embedding
