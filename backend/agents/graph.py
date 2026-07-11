"""
LangGraph editorial workflow graph.
Runs Character, Plot, Timeline, Dialogue reviewers in parallel,
then passes results to the Chief Editor for final synthesis.
"""
from langgraph.graph import END, StateGraph

from agents.character_agent import character_reviewer_node
from agents.chief_editor_agent import chief_editor_node
from agents.dialogue_agent import dialogue_reviewer_node
from agents.plot_agent import plot_reviewer_node
from agents.state import EditorialState
from agents.timeline_agent import timeline_reviewer_node
from utils.logger import get_logger

logger = get_logger(__name__)


def _build_graph() -> StateGraph:
    """Construct the LangGraph StateGraph for the editorial workflow."""
    graph = StateGraph(EditorialState)

    # Add all nodes
    graph.add_node("character_reviewer", character_reviewer_node)
    graph.add_node("plot_reviewer", plot_reviewer_node)
    graph.add_node("timeline_reviewer", timeline_reviewer_node)
    graph.add_node("dialogue_reviewer", dialogue_reviewer_node)
    graph.add_node("chief_editor", chief_editor_node)

    # Entry point fans out to all four reviewers
    graph.set_entry_point("character_reviewer")

    # Sequential pipeline (simulates parallel via chaining)
    # Note: True parallel requires async LangGraph — keeping sequential for MVP simplicity
    graph.add_edge("character_reviewer", "plot_reviewer")
    graph.add_edge("plot_reviewer", "timeline_reviewer")
    graph.add_edge("timeline_reviewer", "dialogue_reviewer")
    graph.add_edge("dialogue_reviewer", "chief_editor")
    graph.add_edge("chief_editor", END)

    return graph


# Compile once at module load
_compiled_graph = _build_graph().compile()


def run_editorial_workflow(
    manuscript_id: str,
    title: str,
    manuscript_text: str,
    chapters: list[dict],
    entities: dict,
) -> dict:
    """
    Run the full editorial review workflow.

    :param manuscript_id: DB manuscript ID.
    :param title: Manuscript title.
    :param manuscript_text: Full cleaned text.
    :param chapters: List of chapter dicts with number, title, text.
    :param entities: Dict with keys: characters, locations, dates_events, dialogues.
    :returns: Final report dict from Chief Editor.
    """
    logger.info("workflow_start", manuscript_id=manuscript_id)

    initial_state: EditorialState = {
        "manuscript_id": manuscript_id,
        "title": title,
        "manuscript_text": manuscript_text,
        "chapters": chapters,
        "characters": entities.get("characters", []),
        "locations": entities.get("locations", []),
        "dates_events": entities.get("dates_events", []),
        "dialogues": entities.get("dialogues", []),
        "character_review": None,
        "plot_review": None,
        "timeline_review": None,
        "dialogue_review": None,
        "final_report": None,
        "errors": [],
    }

    final_state = _compiled_graph.invoke(initial_state)

    if final_state.get("errors"):
        logger.warning(
            "workflow_completed_with_errors",
            errors=final_state["errors"],
        )
    else:
        logger.info("workflow_completed_successfully", manuscript_id=manuscript_id)

    return final_state.get("final_report") or {}
