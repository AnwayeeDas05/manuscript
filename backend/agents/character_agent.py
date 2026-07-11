"""
Character Reviewer Agent node.
"""
import json

from agents.base import call_gemini_agent, truncate_text
from agents.state import AgentReview, EditorialState
from config import get_settings
from prompts.character_prompt import CHARACTER_REVIEWER_PROMPT
from utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


def character_reviewer_node(state: EditorialState) -> EditorialState:
    """LangGraph node: run the Character Reviewer agent."""
    logger.info("character_reviewer_start", manuscript_id=state["manuscript_id"])

    text = truncate_text(state["manuscript_text"], settings.max_context_chars)
    characters_str = ", ".join(state.get("characters", [])[:50]) or "None extracted"

    prompt = CHARACTER_REVIEWER_PROMPT.format(
        title=state["title"],
        characters=characters_str,
        manuscript_text=text,
    )

    try:
        result = call_gemini_agent(prompt, agent_name="character_reviewer")
        review: AgentReview = {
            "score": float(result.get("score", 5.0)),
            "summary": result.get("summary", ""),
            "findings": result.get("findings", []),
            "raw_json": json.dumps(result),
            "error": None,
        }
        logger.info(
            "character_reviewer_done",
            score=review["score"],
            findings=len(review["findings"]),
        )
    except Exception as e:
        logger.error("character_reviewer_failed", error=str(e))
        review = {
            "score": 0.0,
            "summary": "Character review failed due to an error.",
            "findings": [],
            "raw_json": "{}",
            "error": str(e),
        }
        state["errors"].append(f"character_reviewer: {e}")

    return {**state, "character_review": review}
