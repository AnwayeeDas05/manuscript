"""
Revision comparison service.
Calls Gemini to compare two versions' findings and saves a RevisionHistory entry.
"""
import json

from agents.base import call_gemini_agent_async
from prompts.revision_prompt import REVISION_COMPARISON_PROMPT
from utils.logger import get_logger

logger = get_logger(__name__)


def _gather_all_findings(report: dict) -> list:
    """Flatten all findings from a full report dict into one list."""
    findings = []
    for key in ("critical_findings", "major_findings", "moderate_findings", "minor_findings", "suggestions"):
        findings.extend(report.get(key, []))
    # Fallback for old reports that only have major/minor
    if not findings:
        for key in ("major_findings", "minor_findings"):
            findings.extend(report.get(key, []))
    # Also gather from per-agent analysis
    for agent_key in ("character_analysis", "plot_analysis", "timeline_analysis", "dialogue_analysis"):
        analysis = report.get(agent_key, {})
        findings.extend(analysis.get("findings", []))
    # Deduplicate by id
    seen = set()
    unique = []
    for f in findings:
        fid = f.get("id", "")
        if fid and fid not in seen:
            seen.add(fid)
            unique.append(f)
        elif not fid:
            unique.append(f)
    return unique


async def generate_revision_comparison(
    title: str,
    previous_report: dict,
    current_report: dict,
    from_version: int,
    to_version: int,
) -> dict:
    """
    Use Gemini to compare findings between two versions.
    Returns a structured comparison dict.
    Uses call_gemini_agent_async so the event loop is never blocked.
    """
    previous_findings = _gather_all_findings(previous_report)
    current_findings = _gather_all_findings(current_report)

    previous_score = previous_report.get("overall_score", 0)
    current_score = current_report.get("overall_score", 0)

    prompt = REVISION_COMPARISON_PROMPT.format(
        title=title,
        from_version=from_version,
        to_version=to_version,
        previous_findings_json=json.dumps(previous_findings, indent=2),
        current_findings_json=json.dumps(current_findings, indent=2),
        previous_score=previous_score,
        current_score=current_score,
    )

    try:
        result = await call_gemini_agent_async(prompt, agent_name="revision_comparison")
        result.setdefault("from_version", from_version)
        result.setdefault("to_version", to_version)
        result.setdefault("score_change", round(float(current_score) - float(previous_score), 1))
        result.setdefault("issues_fixed", [])
        result.setdefault("issues_still_present", [])
        result.setdefault("new_issues", [])
        result.setdefault("summary", "")
        logger.info(
            "revision_comparison_done",
            from_version=from_version,
            to_version=to_version,
            fixed=len(result.get("issues_fixed", [])),
            new=len(result.get("new_issues", [])),
        )
        return result
    except Exception as e:
        logger.error("revision_comparison_failed", error=str(e))
        # Return a minimal comparison
        return {
            "from_version": from_version,
            "to_version": to_version,
            "score_change": round(float(current_score) - float(previous_score), 1),
            "issues_fixed": [],
            "issues_still_present": [],
            "new_issues": [],
            "summary": f"Revision comparison could not be generated. Error: {e}",
        }
