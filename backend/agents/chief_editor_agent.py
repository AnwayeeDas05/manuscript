"""
Chief Editor Agent node — merges all reviewer outputs into the final report.
Programmatic score calculation based on finding severity weights.
"""
import json
from datetime import datetime, timezone

from agents.base import call_gemini_agent
from agents.state import EditorialState
from prompts.chief_editor_prompt import CHIEF_EDITOR_PROMPT
from utils.logger import get_logger

logger = get_logger(__name__)

# Severity → score deduction map (max score = 100)
SEVERITY_DEDUCTIONS = {
    "critical": 25,
    "major": 15,
    "moderate": 8,
    "minor": 3,
    "suggestion": 1,
}


def compute_score_from_findings(findings: list) -> float:
    """Compute a 0-100 score by deducting points per severity level."""
    score = 100.0
    for f in findings:
        sev = f.get("severity", "minor").lower()
        score -= SEVERITY_DEDUCTIONS.get(sev, 3)
    return round(max(0.0, min(100.0, score)), 1)


def _safe_review_json(review) -> str:
    """Safely serialize a review to JSON string for the prompt."""
    if review is None:
        return json.dumps({"score": 0, "summary": "Review not available.", "findings": []})
    return review.get("raw_json", json.dumps({"score": 0, "summary": "", "findings": []}))


def chief_editor_node(state: EditorialState) -> EditorialState:
    """LangGraph node: Chief Editor merges all reviews into the final report."""
    logger.info("chief_editor_start", manuscript_id=state["manuscript_id"])

    generated_at = datetime.now(tz=timezone.utc).isoformat()

    prompt = CHIEF_EDITOR_PROMPT.format(
        title=state["title"],
        manuscript_id=state["manuscript_id"],
        character_review=_safe_review_json(state.get("character_review")),
        plot_review=_safe_review_json(state.get("plot_review")),
        timeline_review=_safe_review_json(state.get("timeline_review")),
        dialogue_review=_safe_review_json(state.get("dialogue_review")),
        generated_at=generated_at,
    )

    try:
        result = call_gemini_agent(prompt, agent_name="chief_editor")
        # Ensure required fields are present
        result.setdefault("manuscript_id", state["manuscript_id"])
        result.setdefault("title", state["title"])
        result.setdefault("generated_at", generated_at)
        result.setdefault("critical_findings", [])
        result.setdefault("major_findings", [])
        result.setdefault("moderate_findings", [])
        result.setdefault("minor_findings", [])
        result.setdefault("suggestions", [])
        result.setdefault("recommendations", [])
        result.setdefault("overall_assessment", "")

        # Programmatic score calculation — overrides LLM-supplied score
        all_findings = (
            result.get("critical_findings", [])
            + result.get("major_findings", [])
            + result.get("moderate_findings", [])
            + result.get("minor_findings", [])
            + result.get("suggestions", [])
        )
        result["overall_score"] = compute_score_from_findings(all_findings)

        logger.info(
            "chief_editor_done",
            score=result.get("overall_score"),
            critical=len(result.get("critical_findings", [])),
            major=len(result.get("major_findings", [])),
            moderate=len(result.get("moderate_findings", [])),
            minor=len(result.get("minor_findings", [])),
            suggestions=len(result.get("suggestions", [])),
        )
        return {**state, "final_report": result}

    except Exception as e:
        logger.error("chief_editor_failed", error=str(e))
        # Build a fallback report from available data
        fallback = _build_fallback_report(state, generated_at, str(e))
        state["errors"].append(f"chief_editor: {e}")
        return {**state, "final_report": fallback}


def _build_fallback_report(state: EditorialState, generated_at: str, error: str) -> dict:
    """Build a minimal valid report when the Chief Editor call fails."""
    def _safe(review, key, default):
        if review:
            return review.get(key, default)
        return default

    char_r = state.get("character_review")
    plot_r = state.get("plot_review")
    time_r = state.get("timeline_review")
    dial_r = state.get("dialogue_review")

    all_findings = (
        _safe(char_r, "findings", [])
        + _safe(plot_r, "findings", [])
        + _safe(time_r, "findings", [])
        + _safe(dial_r, "findings", [])
    )

    def _by_severity(sev):
        return [f for f in all_findings if f.get("severity") == sev]

    critical = _by_severity("critical")
    major = _by_severity("major")
    moderate = _by_severity("moderate")
    minor = _by_severity("minor")
    suggestions = _by_severity("suggestion")

    overall = compute_score_from_findings(all_findings)

    return {
        "manuscript_id": state["manuscript_id"],
        "title": state["title"],
        "executive_summary": f"Automated review completed with partial data. Chief editor merge failed: {error}",
        "overall_score": overall,
        "character_analysis": {
            "score": _safe(char_r, "score", 5.0),
            "summary": _safe(char_r, "summary", ""),
            "findings": _safe(char_r, "findings", []),
        },
        "plot_analysis": {
            "score": _safe(plot_r, "score", 5.0),
            "summary": _safe(plot_r, "summary", ""),
            "findings": _safe(plot_r, "findings", []),
        },
        "timeline_analysis": {
            "score": _safe(time_r, "score", 5.0),
            "summary": _safe(time_r, "summary", ""),
            "findings": _safe(time_r, "findings", []),
        },
        "dialogue_analysis": {
            "score": _safe(dial_r, "score", 5.0),
            "summary": _safe(dial_r, "summary", ""),
            "findings": _safe(dial_r, "findings", []),
        },
        "critical_findings": critical,
        "major_findings": major,
        "moderate_findings": moderate,
        "minor_findings": minor,
        "suggestions": suggestions,
        "recommendations": ["Please re-run the analysis for a complete report."],
        "overall_assessment": "Review partially completed. Some agents may have encountered errors.",
        "generated_at": generated_at,
    }
