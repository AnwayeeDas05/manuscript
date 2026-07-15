"""
Base Gemini agent — shared logic for all reviewer nodes.
Handles Gemini API calls, JSON parsing, and error recovery.
"""
import asyncio
import json
import re
from functools import partial
from typing import Optional

from utils.logger import get_logger

logger = get_logger(__name__)


def _get_gemini_llm():
    """Build a LangChain ChatGoogleGenerativeAI instance."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from config import get_settings
        settings = get_settings()
        if not settings.google_api_key:
            raise ValueError(
                "GOOGLE_API_KEY is not set. Add it to your .env file."
            )
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=settings.gemini_temperature,
            convert_system_message_to_human=True,
            max_retries=1,          # fail fast — no 60-second retry loops
            request_timeout=45,     # 45-second hard timeout per call
        )
    except ImportError as e:
        raise RuntimeError("langchain-google-genai is not installed.") from e



def _extract_json(text: str) -> str:
    """
    Extract the first JSON object from a string.
    Handles cases where the LLM wraps JSON in markdown fences.
    """
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?\n?", "", text).replace("```", "").strip()

    # Find the outermost JSON object
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in LLM response.")

    depth = 0
    for i, char in enumerate(text[start:], start=start):
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    raise ValueError("Incomplete JSON object in LLM response.")


async def call_gemini_agent_async(prompt: str, agent_name: str) -> dict:
    """
    Async version of call_gemini_agent — uses llm.ainvoke so network I/O and
    retry waits (e.g. 60-second 429 back-offs) yield back to the asyncio event
    loop instead of blocking it.  All agents and services should call this.

    :param prompt: Fully formatted prompt string.
    :param agent_name: Name used for logging.
    :returns: Parsed JSON dict from Gemini.
    :raises RuntimeError: If the API call or JSON parsing fails.
    """
    from langchain_core.messages import HumanMessage

    llm = _get_gemini_llm()
    logger.info("gemini_call_start", agent=agent_name)

    try:
        # ainvoke is the async equivalent of invoke — does NOT block the event loop
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw_text = response.content
        logger.info("gemini_call_success", agent=agent_name, chars=len(raw_text))

        json_str = _extract_json(raw_text)
        parsed = json.loads(json_str)
        return parsed

    except json.JSONDecodeError as e:
        logger.error("gemini_json_parse_error", agent=agent_name, error=str(e))
        raise RuntimeError(f"[{agent_name}] Failed to parse JSON from Gemini: {e}")
    except Exception as e:
        logger.error("gemini_call_error", agent=agent_name, error=str(e))
        raise RuntimeError(f"[{agent_name}] Gemini API call failed: {e}")


def call_gemini_agent(prompt: str, agent_name: str) -> dict:
    """
    Sync shim kept for backward compatibility.
    WARNING: Do NOT call this from an async context — it blocks the event loop.
    Use call_gemini_agent_async instead.
    """
    from langchain_core.messages import HumanMessage

    llm = _get_gemini_llm()
    logger.info("gemini_call_start", agent=agent_name)

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw_text = response.content
        logger.info("gemini_call_success", agent=agent_name, chars=len(raw_text))

        json_str = _extract_json(raw_text)
        parsed = json.loads(json_str)
        return parsed

    except json.JSONDecodeError as e:
        logger.error("gemini_json_parse_error", agent=agent_name, error=str(e))
        raise RuntimeError(f"[{agent_name}] Failed to parse JSON from Gemini: {e}")
    except Exception as e:
        logger.error("gemini_call_error", agent=agent_name, error=str(e))
        raise RuntimeError(f"[{agent_name}] Gemini API call failed: {e}")


def truncate_text(text: str, max_chars: int) -> str:
    """Truncate text to max_chars, appending a notice if truncated."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[... text truncated for context window ...]"
