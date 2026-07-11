"""
LangGraph state definition for the editorial review workflow.
"""
from typing import Any, Optional, TypedDict


class AgentReview(TypedDict):
    """Output from a single reviewer agent."""
    score: float
    summary: str
    findings: list[dict]
    raw_json: str  # Original JSON string from Gemini
    error: Optional[str]


class EditorialState(TypedDict):
    """Shared state passed between all nodes in the LangGraph workflow."""
    # Inputs
    manuscript_id: str
    title: str
    manuscript_text: str  # Full (possibly truncated) text
    chapters: list[dict]
    characters: list[str]  # Character names
    locations: list[str]
    dates_events: list[str]
    dialogues: list[str]  # Dialogue snippets

    # Agent outputs (populated as workflow progresses)
    character_review: Optional[AgentReview]
    plot_review: Optional[AgentReview]
    timeline_review: Optional[AgentReview]
    dialogue_review: Optional[AgentReview]
    final_report: Optional[dict]  # Complete merged report from Chief Editor

    # Error tracking
    errors: list[str]
