"""
Timeline Reviewer Agent node.
"""
import json

from agents.base import call_gemini_agent, truncate_text
from agents.state import AgentReview, EditorialState
from config import get_settings
from prompts.timeline_prompt import TIMELINE_REVIEWER_PROMPT
from utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


def timeline_reviewer_node(state: EditorialState) -> EditorialState:
    """LangGraph node: run the Timeline Reviewer agent."""
    logger.info("timeline_reviewer_start", manuscript_id=state["manuscript_id"])

    text = truncate_text(state["manuscript_text"], settings.max_context_chars)
    dates_events_str = (
        ", ".join(
            (state.get("dates_events") or [])[:50]
        )
        or "None extracted"
    )

    prompt = TIMELINE_REVIEWER_PROMPT.format(
        title=state["title"],
        dates_events=dates_events_str,
        manuscript_text=text,
    )

    try:
        result = call_gemini_agent(prompt, agent_name="timeline_reviewer")
        review: AgentReview = {
            "score": float(result.get("score", 5.0)),
            "summary": result.get("summary", ""),
            "findings": result.get("findings", []),
            "raw_json": json.dumps(result),
            "error": None,
        }
        logger.info(
            "timeline_reviewer_done",
            score=review["score"],
            findings=len(review["findings"]),
        )
    except Exception as e:
        logger.error("timeline_reviewer_failed", error=str(e))
        review = {
            "score": 0.0,
            "summary": "Timeline review failed due to an error.",
            "findings": [],
            "raw_json": "{}",
            "error": str(e),
        }
        state["errors"].append(f"timeline_reviewer: {e}")

    return {**state, "timeline_review": review}
