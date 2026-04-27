"""Abstract base interface for LLM providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum


class TaskType(str, Enum):
    SUMMARY = "summary"
    QUIZ = "quiz"


@dataclass
class LLMResponse:
    content: str
    model_name: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0
    raw_output: dict = field(default_factory=dict)


@dataclass
class SummaryOutput:
    title: str
    summary: str
    key_points: list[str]
    word_count: int


@dataclass
class QuizQuestion:
    question: str
    options: list[str]          # 4 choices for MCQ
    correct_answer: str
    explanation: str


@dataclass
class QuizOutput:
    questions: list[QuizQuestion]
    total_questions: int


class BaseLLM(ABC):
    """Abstract interface that all LLM providers must implement."""

    provider_name: str = ""
    default_model: str = ""

    @abstractmethod
    async def generate_summary(self, context: str, document_title: str = "") -> LLMResponse:
        """Generate a structured summary of the provided context.

        Args:
            context: Concatenated document chunks to summarise.
            document_title: Optional title to include in the prompt.

        Returns:
            LLMResponse with JSON-parseable content matching SummaryOutput.
        """

    @abstractmethod
    async def generate_quiz(self, context: str, num_questions: int = 5) -> LLMResponse:
        """Generate multiple-choice quiz questions from the provided context.

        Args:
            context: Concatenated document chunks to build quiz from.
            num_questions: Number of MCQ questions to produce.

        Returns:
            LLMResponse with JSON-parseable content matching QuizOutput.
        """

    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        """Return an embedding vector for the provided text."""

    # ------------------------------------------------------------------ #
    # Shared prompt templates                                              #
    # ------------------------------------------------------------------ #

    def _summary_prompt(self, context: str, document_title: str) -> str:
        title_line = f'Document title: "{document_title}"\n\n' if document_title else ""
        return (
            f"{title_line}"
            "You are an expert summariser. Read the following document context and produce a structured summary.\n\n"
            "Respond ONLY with valid JSON matching this schema:\n"
            '{"title": "string", "summary": "string (2-4 paragraphs)", '
            '"key_points": ["point 1", "point 2", ...], "word_count": number}\n\n'
            f"CONTEXT:\n{context}"
        )

    def _quiz_prompt(self, context: str, num_questions: int) -> str:
        return (
            f"You are an expert quiz creator. Read the context and create {num_questions} multiple-choice questions.\n\n"
            "IMPORTANT: You MUST write ALL text (questions, options, explanations) in KOREAN (한국어). No exceptions.\n\n"
            "Respond ONLY with valid JSON matching this schema:\n"
            '{"questions": [{"question": "string", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], '
            '"correct_answer": "A"|"B"|"C"|"D", "explanation": "string"}], "total_questions": number}\n\n'
            f"CONTEXT:\n{context}"
        )
