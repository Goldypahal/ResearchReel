import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import List, Optional
from ..models.chunk import Chunk
from ..core.settings import settings
from ..core.llm_factory import get_chat_llm
from ..core.retry_utils import (
    APIRateLimitError,
    APIServerError,
    APITimeoutError,
    retry_api_call,
    LLMUnavailableError,
)
from .prompt_loader import PromptLoader

logger = logging.getLogger(__name__)

class AnswerChain:
    def __init__(self):
        self.llm = get_chat_llm()
        self.prompt_loader = PromptLoader()

    def _get_chain(self, version: str = "v1"):
        template = self.prompt_loader.load_prompt("answer_grounded", version=version)
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()

    @retry_api_call(max_attempts=5, min_wait=1, max_wait=20)
    def _call_llm(self, chain, input_data: dict) -> str:
        try:
            return chain.invoke(input_data)
        except Exception as exc:
            msg = str(exc).lower()
            if "timeout" in msg:
                raise APITimeoutError(str(exc)) from exc
            if "429" in msg or "rate" in msg:
                raise APIRateLimitError(str(exc)) from exc
            if any(x in msg for x in ["500", "502", "503", "504", "server"]):
                raise APIServerError(str(exc)) from exc
            raise

    def generate(self, query: str, chunks: List[Chunk], prompt_version: str = "v1") -> str:
        import time
        model_name = settings.GEMINI_MODEL if settings.provider == "gemini" else settings.OLLAMA_MODEL
        logger.info(f"Generating answer ({settings.provider}: {model_name})...")
        def _source_header(i: int, c: Chunk) -> str:
            bits = [c.title] if c.title else []
            if c.section:
                bits.append(c.section)
            if c.page_start is not None:
                bits.append(f"p.{c.page_start}")
            return f"Source {i}" + (f" ({'; '.join(bits)})" if bits else "")

        context_text = "\n\n".join(f"{_source_header(i, c)}: {c.text}" for i, c in enumerate(chunks))
        
        start_time = time.time()
        try:
            chain = self._get_chain(version=prompt_version)
            response = self._call_llm(chain, {"context": context_text, "question": query})
            elapsed = time.time() - start_time
            logger.info(f"LLM generation completed in {elapsed:.2f} seconds.")
            return response
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"LLM generation failed after {elapsed:.2f}s (version={prompt_version}): {e}")
            raise LLMUnavailableError(str(e)) from e
