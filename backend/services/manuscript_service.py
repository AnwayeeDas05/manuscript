"""
Manuscript processing service — orchestrates parsing → entity extraction → AI review → report.
All steps run synchronously (FastAPI background task wrapper handles async).
"""
import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from agents.graph import run_editorial_workflow
from repositories.document_repos import (
    EditorialReportRepository,
    EntityRepository,
    ParsedDocumentRepository,
    ReviewRepository,
)
from repositories.manuscript_repo import ManuscriptRepository
from services.document_parser import parse_document
from services.entity_extractor import extract_entities
from utils.logger import get_logger

logger = get_logger(__name__)


async def process_manuscript(manuscript_id: str, db: AsyncSession) -> None:
    """
    Full processing pipeline for a manuscript:
    1. Mark as processing
    2. Parse document
    3. Extract entities
    4. Run AI review agents
    5. Save report
    6. Mark as completed (or failed)

    This function is designed to run inside a FastAPI BackgroundTask.
    """
    ms_repo = ManuscriptRepository(db)
    pd_repo = ParsedDocumentRepository(db)
    ent_repo = EntityRepository(db)
    rev_repo = ReviewRepository(db)
    rep_repo = EditorialReportRepository(db)

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

        # ── Step 4: Run AI review workflow ────────────────────────────────
        chapters_for_agents = [
            {"number": c.number, "title": c.title, "text": c.text}
            for c in parsed.chapters
        ]
        final_report = run_editorial_workflow(
            manuscript_id=manuscript_id,
            title=manuscript.title,
            manuscript_text=parsed.full_text,
            chapters=chapters_for_agents,
            entities=entity_context,
        )

        # ── Step 5: Persist reviews and report ───────────────────────────
        # We store the sub-analysis results as individual review records
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

        # ── Step 6: Save final editorial report ───────────────────────────
        major_count = len(final_report.get("major_findings", []))
        minor_count = len(final_report.get("minor_findings", []))
        await rep_repo.create_or_replace(
            manuscript_id=manuscript_id,
            report_json=json.dumps(final_report),
            overall_score=float(final_report.get("overall_score", 0)),
            executive_summary=final_report.get("executive_summary", ""),
            major_count=major_count,
            minor_count=minor_count,
        )
        await ms_repo.update_status(manuscript, "completed")
        await db.commit()
        logger.info("processing_complete", manuscript_id=manuscript_id)

    except Exception as e:
        logger.error("processing_failed", manuscript_id=manuscript_id, error=str(e))
        await ms_repo.update_status(manuscript, "failed", error_message=str(e))
        await db.commit()
