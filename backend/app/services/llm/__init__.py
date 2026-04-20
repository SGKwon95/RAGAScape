from app.services.llm.base import BaseLLM, LLMResponse, TaskType
from app.services.llm.claude_llm import ClaudeLLM
from app.services.llm.openai_llm import OpenAILLM
from app.services.llm.qwen_llm import QwenLLM

LLM_REGISTRY: dict[str, type[BaseLLM]] = {
    "gpt": OpenAILLM,
    "claude": ClaudeLLM,
    "qwen": QwenLLM,
}


def get_llm(provider: str) -> BaseLLM:
    cls = LLM_REGISTRY.get(provider)
    if cls is None:
        raise ValueError(f"Unknown LLM provider: {provider}. Choose from {list(LLM_REGISTRY)}")
    return cls()


__all__ = ["BaseLLM", "LLMResponse", "TaskType", "OpenAILLM", "ClaudeLLM", "QwenLLM", "get_llm"]
