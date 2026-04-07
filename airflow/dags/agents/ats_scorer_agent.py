"""ATS Scorer wrapper. Uses Drishti's scorer.py directly (NOT CrewAI)."""
import logging

from utils.scorer import score_resume_vs_jd
from utils.schemas import AgentResult, CategoryScore

logger = logging.getLogger(__name__)


def run_ats_scorer(job_description: str, resume_text: str) -> dict:
    """
    Score resume against job description using Drishti's ATS scorer.
    Maps the scorer output to standardized AgentResult format.
    """
    raw_result = score_resume_vs_jd(job_description, resume_text)

    # Normalize subscores to 0-100 scale
    skills_raw = raw_result.get("skills_match_score", 0)        # out of 40
    experience_raw = raw_result.get("experience_score", 0)      # out of 30
    projects_raw = raw_result.get("projects_score", 0)          # out of 20
    education_raw = raw_result.get("education_score", 0)        # out of 10

    skills_normalized = round((skills_raw / 40) * 100, 1) if skills_raw else 0
    experience_normalized = round((experience_raw / 30) * 100, 1) if experience_raw else 0
    projects_normalized = round((projects_raw / 20) * 100, 1) if projects_raw else 0
    education_normalized = round((education_raw / 10) * 100, 1) if education_raw else 0

    # Clamp to 100
    skills_normalized = min(100, skills_normalized)
    experience_normalized = min(100, experience_normalized)
    projects_normalized = min(100, projects_normalized)
    education_normalized = min(100, education_normalized)

    # Build evidence
    matched = raw_result.get("matched_skills", [])
    missing = raw_result.get("missing_skills", [])
    skills_evidence = []
    if matched:
        skills_evidence.append(f"Matched: {', '.join(matched)}")
    if missing:
        skills_evidence.append(f"Missing: {', '.join(missing)}")

    explanation = raw_result.get("explanation", "")

    agent_result = AgentResult(
        agent_name="ats_scorer",
        category_scores=[
            CategoryScore(
                category="skills_match",
                score=skills_normalized,
                weight=0.40,
                evidence=skills_evidence,
            ),
            CategoryScore(
                category="experience_relevance",
                score=experience_normalized,
                weight=0.30,
                evidence=[explanation[:300]] if explanation else [],
            ),
            CategoryScore(
                category="projects",
                score=projects_normalized,
                weight=0.20,
                evidence=[],
            ),
            CategoryScore(
                category="education",
                score=education_normalized,
                weight=0.10,
                evidence=[],
            ),
        ],
        overall_score=raw_result.get("overall_score", 0),
        strengths=raw_result.get("strengths", []),
        weaknesses=raw_result.get("weaknesses", []),
    )
    return agent_result.model_dump()
