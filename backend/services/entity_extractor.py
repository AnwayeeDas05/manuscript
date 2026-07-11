"""
Entity extractor service using spaCy.
Extracts characters (PERSON), locations (GPE/LOC), organizations (ORG),
dates (DATE), events (EVENT), and dialogue sections from manuscript text.
"""
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Optional

from utils.logger import get_logger

logger = get_logger(__name__)

# Lazy-loaded spaCy model — loaded once per process
_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            from config import get_settings
            settings = get_settings()
            _nlp = spacy.load(settings.spacy_model)
            logger.info("spacy_model_loaded", model=settings.spacy_model)
        except OSError:
            raise RuntimeError(
                "spaCy model not found. Run: python -m spacy download en_core_web_sm"
            )
    return _nlp


@dataclass
class ExtractedEntities:
    characters: list[dict] = field(default_factory=list)
    locations: list[dict] = field(default_factory=list)
    organizations: list[dict] = field(default_factory=list)
    dates: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    dialogues: list[dict] = field(default_factory=list)

    def to_flat_list(self) -> list[dict]:
        """Flatten all entities into a single list for bulk DB insert."""
        result = []
        for ent in self.characters:
            result.append({**ent, "entity_type": "PERSON"})
        for ent in self.locations:
            result.append({**ent, "entity_type": "LOCATION"})
        for ent in self.organizations:
            result.append({**ent, "entity_type": "ORG"})
        for ent in self.dates:
            result.append({**ent, "entity_type": "DATE"})
        for ent in self.events:
            result.append({**ent, "entity_type": "EVENT"})
        for ent in self.dialogues:
            result.append({**ent, "entity_type": "DIALOGUE"})
        return result


# ── Dialogue detection ────────────────────────────────────────────────────────

_DIALOGUE_RE = re.compile(r'"([^"]{10,})"', re.DOTALL)  # "quoted text" min 10 chars


def _extract_dialogues(text: str, chapter_number: int = 1) -> list[dict]:
    """
    Extract quoted dialogue sections.
    Only keeps dialogue lines longer than 10 characters to avoid false positives.
    """
    matches = _DIALOGUE_RE.findall(text)
    dialogues = []
    seen: set[str] = set()
    for match in matches:
        clean = match.strip()
        if clean and clean not in seen:
            seen.add(clean)
            dialogues.append(
                {
                    "text": f'"{clean}"',
                    "canonical": clean[:100],
                    "chapter_number": chapter_number,
                    "frequency": 1,
                }
            )
    return dialogues[:200]  # Cap to 200 per chapter


# ── Main extraction ───────────────────────────────────────────────────────────

def extract_entities(chapters: list[dict]) -> ExtractedEntities:
    """
    Run NLP entity extraction over all chapters.

    :param chapters: List of dicts with keys: number, text.
    :returns: ExtractedEntities with all entity types populated.
    """
    nlp = _get_nlp()

    # Accumulate across chapters
    person_counter: Counter = Counter()
    location_counter: Counter = Counter()
    org_counter: Counter = Counter()
    date_counter: Counter = Counter()
    event_counter: Counter = Counter()
    # Map entity text → first chapter seen
    first_chapter: dict[str, int] = {}

    all_dialogues: list[dict] = []

    for chapter in chapters:
        ch_num = chapter.get("number", 1)
        text = chapter.get("text", "")
        if not text.strip():
            continue

        # Limit text to avoid memory issues with very long chapters
        text_snippet = text[:50_000]

        doc = nlp(text_snippet)

        for ent in doc.ents:
            key = ent.text.strip()
            if len(key) < 2:
                continue
            if ent.label_ == "PERSON":
                person_counter[key] += 1
                if key not in first_chapter:
                    first_chapter[key] = ch_num
            elif ent.label_ in ("GPE", "LOC"):
                location_counter[key] += 1
                if key not in first_chapter:
                    first_chapter[key] = ch_num
            elif ent.label_ == "ORG":
                org_counter[key] += 1
                if key not in first_chapter:
                    first_chapter[key] = ch_num
            elif ent.label_ == "DATE":
                date_counter[key] += 1
                if key not in first_chapter:
                    first_chapter[key] = ch_num
            elif ent.label_ == "EVENT":
                event_counter[key] += 1
                if key not in first_chapter:
                    first_chapter[key] = ch_num

        # Dialogue extraction
        all_dialogues.extend(_extract_dialogues(text, chapter_number=ch_num))

    def _to_entity_list(counter: Counter, threshold: int = 1) -> list[dict]:
        return [
            {
                "text": text,
                "canonical": text,
                "chapter_number": first_chapter.get(text),
                "frequency": count,
            }
            for text, count in counter.most_common(100)
            if count >= threshold
        ]

    extracted = ExtractedEntities(
        characters=_to_entity_list(person_counter),
        locations=_to_entity_list(location_counter),
        organizations=_to_entity_list(org_counter),
        dates=_to_entity_list(date_counter),
        events=_to_entity_list(event_counter),
        dialogues=all_dialogues[:500],
    )

    logger.info(
        "entities_extracted",
        characters=len(extracted.characters),
        locations=len(extracted.locations),
        orgs=len(extracted.organizations),
        dates=len(extracted.dates),
        events=len(extracted.events),
        dialogues=len(extracted.dialogues),
    )
    return extracted
