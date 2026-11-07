from __future__ import annotations
import re
import json
import logging
from typing import Dict, List, Any
from langchain_core.prompts import ChatPromptTemplate
from ..models.chunk import Chunk
from ..core.settings import settings
from ..core.llm_factory import get_chat_llm
from ..generation.prompt_loader import PromptLoader

logger = logging.getLogger(__name__)

BATCH_VERIFICATION_PROMPT = """You are an expert citation and fact-checking assistant.
Your task is to verify which sentences in the "Generated Answer" are directly supported by the provided "Source Chunks" of scientific papers.

[Source Chunks]
{source_chunks_text}

[Generated Answer]
{generated_answer_text}

For each sentence in the "Generated Answer", determine if it is directly supported by any of the "Source Chunks".
Respond strictly with a JSON object in this format:
{{
  "verifications": [
     {{
        "sentence_index": <int, the 0-based index of the sentence>,
        "sentence": "<str, the exact sentence text>",
        "is_supported": <bool, true if supported, false otherwise>,
        "supported_by_chunk_index": <int, the 0-based index of the supporting chunk, or null>,
        "quote": "<str, the exact quote from the chunk supporting the claim, or empty string>"
     }}
  ]
}}
Ensure the response is valid, parsable JSON. Do not include markdown code block formatting like ```json or any trailing characters.
"""

class CitationEnforcer:
    def __init__(self):
        self.llm = get_chat_llm() if settings.ENABLE_CITATION_CHECK else None
        self.prompt_loader = PromptLoader()

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.strip().lower())

    def enforce(self, answer: str, chunks: List[Chunk]) -> Dict[str, Any]:
        if not answer or not chunks:
            return {
                "answer": answer or "Insufficient evidence in retrieved sources.",
                "citations": [],
                "limitations": ["No content or chunks provided for verification."]
            }

        # Split into sentences considering common abbreviations
        sentence_endings = r'(?<![A-Z])(?<!et al)(?<!e\.g)(?<!i\.e)(?<!Fig)\.\s+'
        sentences = [s.strip() for s in re.split(sentence_endings, answer) if s.strip()]
        
        supported_sentences: List[str] = []
        citations: List[Dict[str, Any]] = []
        verification_map = {}

        # 1. Format inputs for Batch LLM verification
        chunks_formatted = []
        for idx, chunk in enumerate(chunks):
            chunks_formatted.append(
                f"Chunk Index {idx}:\n"
                f"Title: {chunk.title or 'Unknown'}\n"
                f"Section: {chunk.section or 'Unknown'}\n"
                f"Content: {chunk.text}\n"
            )
        source_chunks_text = "\n---\n".join(chunks_formatted)

        sentences_formatted = []
        for idx, sent in enumerate(sentences):
            sentences_formatted.append(f"Sentence Index {idx}: {sent}")
        generated_answer_text = "\n".join(sentences_formatted)

        # 2. Try Batch LLM verification first
        if self.llm:
            try:
                prompt_content = BATCH_VERIFICATION_PROMPT.format(
                    source_chunks_text=source_chunks_text,
                    generated_answer_text=generated_answer_text
                )
                logger.info(f"Performing batch citation check for {len(sentences)} claims against {len(chunks)} chunks...")
                response = self.llm.invoke(prompt_content)
                res_text = response.content if hasattr(response, 'content') else str(response)
                
                # Strip markdown code blocks if present
                res_text = res_text.strip()
                if res_text.startswith("```"):
                    res_text = re.sub(r"^```(?:json)?\s*", "", res_text)
                    res_text = re.sub(r"\s*```$", "", res_text)
                
                # Extract first { and last } to isolate JSON
                start_idx = res_text.find("{")
                end_idx = res_text.rfind("}")
                if start_idx != -1 and end_idx != -1:
                    res_text = res_text[start_idx:end_idx+1]
                
                data = json.loads(res_text)
                verifications = data.get("verifications", [])
                
                for item in verifications:
                    s_idx = item.get("sentence_index")
                    is_supp = item.get("is_supported", False)
                    c_idx = item.get("supported_by_chunk_index")
                    if is_supp and s_idx is not None and c_idx is not None:
                        if 0 <= c_idx < len(chunks):
                            verification_map[s_idx] = (chunks[c_idx], item.get("quote", ""))
                logger.info(f"Batch citation check completed successfully. Verified {len(verification_map)} of {len(sentences)} claims.")
            except Exception as e:
                logger.warning(f"Batch citation verification failed ({e}). Falling back to overlap heuristic.")

        # 3. Attach a numbered citation to every sentence we can tie to a chunk.
        #    The answer text itself is kept as generated (Markdown intact); markers
        #    like [1] are inserted after supported sentences.
        citation_number_by_chunk: Dict[str, int] = {}
        markers = []  # (sentence_text, number)
        for i, sent in enumerate(sentences):
            best_chunk = None
            quote_text = ""
            if i in verification_map:
                best_chunk, quote_text = verification_map[i]
            else:
                candidates = self._find_candidate_chunks(sent, chunks)
                if candidates:
                    best_chunk = candidates[0]
            if not best_chunk:
                continue

            if best_chunk.chunk_id not in citation_number_by_chunk:
                citation_number_by_chunk[best_chunk.chunk_id] = len(citations) + 1
                section_seg = best_chunk.section
                if isinstance(section_seg, str) and section_seg.strip().lower() in {"none", "undefined", "null", ""}:
                    section_seg = None
                title_seg = best_chunk.title if best_chunk.title and best_chunk.title.lower() not in {"none", "undefined", "null", "unknown title"} else best_chunk.paper_id
                page_seg = f"p.{best_chunk.page_start}" if best_chunk.page_start is not None else None
                citations.append({
                    "number": citation_number_by_chunk[best_chunk.chunk_id],
                    "label": " | ".join(x for x in [title_seg, section_seg, page_seg] if x),
                    "quote": (quote_text or best_chunk.text)[:400],
                    "paper_id": best_chunk.paper_id,
                    "title": title_seg,
                    "section": section_seg,
                    "page_start": best_chunk.page_start,
                    "page_end": best_chunk.page_end,
                    "chunk_id": best_chunk.chunk_id,
                })
            supported_sentences.append(sent)
            markers.append((sent, citation_number_by_chunk[best_chunk.chunk_id]))

        final_answer = answer
        cursor = 0
        insertions = []
        for sent, number in markers:
            pos = final_answer.find(sent, cursor)
            if pos == -1:
                continue
            end_pos = pos + len(sent)
            if end_pos < len(final_answer) and final_answer[end_pos] in ".!?":
                end_pos += 1
            insertions.append((end_pos, number))
            cursor = end_pos
        for end_pos, number in reversed(insertions):
            final_answer = final_answer[:end_pos] + f" [{number}]" + final_answer[end_pos:]

        return {
            "answer": final_answer.strip() or "Insufficient evidence in retrieved sources.",
            "citations": citations,
            "limitations": [] if supported_sentences else ["The answer could not be matched to specific passages."],
        }

    def _find_candidate_chunks(self, sentence: str, chunks: List[Chunk]) -> List[Chunk]:
        s_norm = self._normalize(sentence)
        sentence_terms = set(re.findall(r"\w+", s_norm))
        if len(sentence_terms) < 5: return []
        
        candidates = []
        for chunk in chunks:
            chunk_terms = set(re.findall(r"\w+", self._normalize(chunk.text)))
            overlap = len(sentence_terms & chunk_terms) / len(sentence_terms)
            if overlap > 0.2:
                candidates.append(chunk)
        return candidates
