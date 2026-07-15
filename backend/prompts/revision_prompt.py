"""
Revision Comparison Agent prompt.
Instructs Gemini to compare two version's findings and produce a structured diff summary.
"""

REVISION_COMPARISON_PROMPT = """\
You are a professional editorial revision analyst.

Your task is to compare the findings from two versions of the same manuscript and produce a structured comparison.

IMPORTANT RULES:
- Return ONLY valid JSON. No prose, no markdown fences.
- Match findings by title or description similarity, not by exact ID.
- Be specific about what changed. Do NOT be vague.

INPUT:
Manuscript title: {title}
From Version: {from_version}
To Version: {to_version}

Previous version findings (Version {from_version}):
{previous_findings_json}

Current version findings (Version {to_version}):
{current_findings_json}

Previous version overall score: {previous_score}
Current version overall score: {current_score}

REQUIRED JSON OUTPUT FORMAT:
{{
  "from_version": {from_version},
  "to_version": {to_version},
  "score_change": <float, positive means improvement>,
  "issues_fixed": [
    {{
      "title": "<issue title from previous version>",
      "category": "<category>",
      "severity": "<original severity>"
    }}
  ],
  "issues_still_present": [
    {{
      "title": "<issue title>",
      "category": "<category>",
      "severity": "<severity>",
      "note": "<any change in description or recommendation>"
    }}
  ],
  "new_issues": [
    {{
      "title": "<new issue title>",
      "category": "<category>",
      "severity": "<severity>",
      "description": "<brief description>"
    }}
  ],
  "summary": "<2-3 sentence summary of the revision quality and key changes made>"
}}
"""
