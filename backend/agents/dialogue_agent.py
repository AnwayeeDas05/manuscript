"""
Dialogue Reviewer Agent node.
"""
import json

from agents.base import call_gemini_agent, truncate_text
from agents.state import AgentReview, EditorialState
from config import get_settings
from prompts.dialogue_prompt import DIALOGUE_REVIEWER_PROMPT
from utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


def dialogue_reviewer_node(state: EditorialState) -> EditorialState:
    """LangGraph node: run the Dialogue Reviewer agent."""
    logger.info("dialogue_reviewer_start", manuscript_id=state["manuscript_id"])

    text = truncate_text(state["manuscript_text"], settings.max_context_chars)
    # Format dialogue samples for context
    raw_dialogues = state.get("dialogues") or []
    dialogue_samples = "\n".join(f"  - {d}" for d in raw_dialogues[:20]) or "None extracted"

    prompt = DIALOGUE_REVIEWER_PROMPT.format(
        title=state["title"],
        dialogues=dialogue_samples,
        manuscript_text=text,
    )

    try:
        result = call_gemini_agent(prompt, agent_name="dialogue_reviewer")
        review: AgentReview = {
            "score": float(result.get("score", 5.0)),
            "summary": result.get("summary", ""),
            "findings": result.get("findings", []),
            "raw_json": json.dumps(result),
            "error": None,
        }
        logger.info(
            "dialogue_reviewer_done",
            score=review["score"],
            findings=len(review["findings"]),
        )
    except Exception as e:
        logger.error("dialogue_reviewer_failed", error=str(e))
        review = {
            "score": 0.0,
            "summary": "Dialogue review failed due to an error.",
            "findings": [],
            "raw_json": "{}",
            "error": str(e),
        }
        state["errors"].append(f"dialogue_reviewer: {e}")

    return {**state, "dialogue_review": review}
