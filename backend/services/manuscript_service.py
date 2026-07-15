"""
Manuscript processing service — orchestrates parsing → entity extraction → AI review → report.
All steps run synchronously (FastAPI background task wrapper handles async).
"""
import asyncio
import json
from datetime import datetime, timezone
from functools import partial

from sqlalchemy.ext.asyncio import AsyncSession

from agents.graph import run_editorial_workflow
from repositories.document_repos import (
    EditorialReportRepository,
    EntityRepository,
    ParsedDocumentRepository,
    ReviewRepository,
)
from repositories.manuscript_repo import ManuscriptRepository
from repositories.revision_repo import RevisionHistoryRepository
from services.document_parser import parse_document
from services.entity_extractor import extract_entities
from services.revision_service import generate_revision_comparison
from utils.logger import get_logger

logger = get_logger(__name__)


def _count_by_severity(findings: list, severity: str) -> int:
    return sum(1 for f in findings if f.get("severity", "").lower() == severity)


def _collect_all_findings(final_report: dict) -> list:
    """Collect all findings across severity buckets and per-agent sections (deduplicated)."""
    findings = []
    for key in ("critical_findings", "major_findings", "moderate_findings", "minor_findings", "suggestions"):
        findings.extend(final_report.get(key, []))
    # Fallback: if the LLM didn't separate by severity, pull from agent analyses
    if not findings:
        for agent_key in ("character_analysis", "plot_analysis", "timeline_analysis", "dialogue_analysis"):
            findings.extend(final_report.get(agent_key, {}).get("findings", []))
    # Deduplicate by id
    seen, unique = set(), []
    for f in findings:
        fid = f.get("id", "")
        if fid and fid not in seen:
            seen.add(fid)
            unique.append(f)
        elif not fid:
            unique.append(f)
    return unique


async def process_manuscript(manuscript_id: str, db: AsyncSession) -> None:
    """
    Full processing pipeline for a manuscript:
    1. Mark as processing
    2. Parse document
    3. Extract entities
    4. Run AI review agents
    5. Save report
    6. Generate revision comparison (if version > 1)
    7. Mark as completed (or failed)
    """
    ms_repo = ManuscriptRepository(db)
    pd_repo = ParsedDocumentRepository(db)
    ent_repo = EntityRepository(db)
    rev_repo = ReviewRepository(db)
    rep_repo = EditorialReportRepository(db)
    revision_repo = RevisionHistoryRepository(db)

    manuscript = await ms_repo.get_by_id(manuscript_id)
    if not manuscript:
        logger.error("manuscript_not_found", manuscript_id=manuscript_id)
        return

    logger.info("processing_start", manuscript_id=manuscript_id)
    await ms_repo.update_status(manuscript, "processing")
    await db.commit()

    try:
        # ── Step 1: Parse document ────────────────────────────────────────
        parsed = parse_document(manuscript.file_path, manuscript.file_type)
        await pd_repo.create_or_replace(
            manuscript_id=manuscript_id,
            full_text=parsed.full_text,
            chapters=[
                {
                    "number": c.number,
                    "title": c.title,
                    "text": c.text,
                    "word_count": c.word_count,
                }
                for c in parsed.chapters
            ],
            total_words=parsed.total_words,
            total_chapters=parsed.total_chapters,
        )
        await ms_repo.update_status(
            manuscript,
            "processing",
            word_count=parsed.total_words,
            chapter_count=parsed.total_chapters,
        )
        await db.commit()
        logger.info(
            "parsing_complete",
            manuscript_id=manuscript_id,
            words=parsed.total_words,
            chapters=parsed.total_chapters,
        )

        # ── Step 2: Extract entities ──────────────────────────────────────
        chapters_dicts = [
            {"number": c.number, "text": c.text} for c in parsed.chapters
        ]
        extracted = extract_entities(chapters_dicts)
        flat_entities = extracted.to_flat_list()
        await ent_repo.bulk_create(manuscript_id, flat_entities)
        await db.commit()
        logger.info("entity_extraction_complete", manuscript_id=manuscript_id, count=len(flat_entities))

        # ── Step 3: Prepare entity summaries for agents ───────────────────
        entity_context = {
            "characters": [e["text"] for e in extracted.characters[:30]],
            "locations": [e["text"] for e in extracted.locations[:20]],
            "dates_events": [e["text"] for e in (extracted.dates + extracted.events)[:30]],
            "dialogues": [e["text"] for e in extracted.dialogues[:20]],
        }

        # ── Step 4: Run AI review workflow (in thread pool to avoid blocking the event loop) ─
        chapters_for_agents = [
            {"number": c.number, "title": c.title, "text": c.text}
            for c in parsed.chapters
        ]
        loop = asyncio.get_event_loop()
        _WORKFLOW_TIMEOUT_SECONDS = 120  # 2 minutes max — fail fast for demo
        try:
            final_report = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    partial(
                        run_editorial_workflow,
                        manuscript_id=manuscript_id,
                        title=manuscript.title,
                        manuscript_text=parsed.full_text,
                        chapters=chapters_for_agents,
                        entities=entity_context,
                    ),
                ),
                timeout=_WORKFLOW_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            raise RuntimeError(
                f"AI review timed out after {_WORKFLOW_TIMEOUT_SECONDS // 60} minutes. "
                "The Gemini API may be unreachable or quota exhausted. Please retry."
            )

        # ── Step 5: Persist reviews and report ───────────────────────────
        agent_map = {
            "character": final_report.get("character_analysis"),
            "plot": final_report.get("plot_analysis"),
            "timeline": final_report.get("timeline_analysis"),
            "dialogue": final_report.get("dialogue_analysis"),
        }
        for agent_type, analysis in agent_map.items():
            if analysis:
                review = await rev_repo.create_or_replace(manuscript_id, agent_type)
                await rev_repo.complete(
                    review,
                    raw_response=json.dumps(analysis),
                    score=analysis.get("score"),
                )
        await db.commit()

        # ── Step 6: Count findings by severity ───────────────────────────
        all_findings = _collect_all_findings(final_report)
        critical_count = _count_by_severity(all_findings, "critical")
        major_count = _count_by_severity(all_findings, "major")
        moderate_count = _count_by_severity(all_findings, "moderate")
        minor_count = _count_by_severity(all_findings, "minor")
        suggestions_count = _count_by_severity(all_findings, "suggestion")

        # ── Step 7: Save final editorial report ───────────────────────────
        await rep_repo.create_or_replace(
            manuscript_id=manuscript_id,
            report_json=json.dumps(final_report),
            overall_score=float(final_report.get("overall_score", 0)),
            executive_summary=final_report.get("executive_summary", ""),
            major_count=major_count,
            minor_count=minor_count,
            critical_count=critical_count,
            moderate_count=moderate_count,
            suggestions_count=suggestions_count,
        )
        await ms_repo.update_status(manuscript, "completed")
        await db.commit()
        logger.info("processing_complete", manuscript_id=manuscript_id)

        # ── Step 8: Revision comparison (if this is version > 1) ─────────
        if manuscript.parent_id and manuscript.version_number > 1:
            try:
                # Find the previous version
                all_versions = await ms_repo.list_versions(manuscript.parent_id, manuscript.owner_id)
                prev_version = next(
                    (v for v in all_versions if v.version_number == manuscript.version_number - 1),
                    None,
                )
                if prev_version:
                    prev_report_record = await rep_repo.get_by_manuscript(prev_version.id)
                    if prev_report_record and prev_report_record.report_json:
                        prev_report = json.loads(prev_report_record.report_json)
                        comparison = await generate_revision_comparison(
                            title=manuscript.title,
                            previous_report=prev_report,
                            current_report=final_report,
                            from_version=prev_version.version_number,
                            to_version=manuscript.version_number,
                        )
                        await revision_repo.create_or_replace(
                            manuscript_id=manuscript_id,
                            parent_manuscript_id=manuscript.parent_id,
                            from_version=prev_version.version_number,
                            to_version=manuscript.version_number,
                            revision_summary_json=json.dumps(comparison),
                        )
                        await db.commit()
                        logger.info(
                            "revision_comparison_saved",
                            manuscript_id=manuscript_id,
                            from_version=prev_version.version_number,
                            to_version=manuscript.version_number,
                        )
            except Exception as rev_err:
                logger.error("revision_comparison_error", error=str(rev_err))
                # Non-fatal: don't fail the whole manuscript processing

    except Exception as e:
        logger.error("processing_failed", manuscript_id=manuscript_id, error=str(e))
        await ms_repo.update_status(manuscript, "failed", error_message=str(e))
        await db.commit()
