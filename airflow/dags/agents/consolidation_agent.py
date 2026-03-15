"""Consolidation: mechanical scoring + CrewAI qualitative summary.

Step 1 (always succeeds): pure Python weighted scoring.
Step 2 (best-effort): CrewAI agent for qualitative insights.
If Step 2 fails, returns mechanical results with sensible defaults.
"""
import json
import logging

from utils.schemas import AgentResult, ConsolidatedReport

logger = logging.getLogger(__name__)

# Weight configurations
WEIGHTS_WITH_LEETCODE = {
    "ats_scorer": 0.40,
    "github_analyzer": 0.35,
    "leetcode_analyzer": 0.25,
}
WEIGHTS_WITHOUT_LEETCODE = {
    "ats_scorer": 0.55,
    "github_analyzer": 0.45,
}


def consolidate(
    candidate_id: str,
    job_id: str,
    github_result: dict,
    ats_result: dict,
    leetcode_result: dict | None,
) -> dict:
    """
    Two-step consolidation:
    Step 1: Mechanical weighted scoring (pure Python, never fails).
    Step 2: CrewAI qualitative synthesis (best-effort, degrades gracefully).
    """
    # --- Step 1: Mechanical scoring ---
    has_leetcode = leetcode_result is not None
    weights = WEIGHTS_WITH_LEETCODE if has_leetcode else WEIGHTS_WITHOUT_LEETCODE

    agent_results = [AgentResult(**ats_result), AgentResult(**github_result)]
    if has_leetcode:
        agent_results.append(AgentResult(**leetcode_result))

    # Weighted final score
    final_score = 0.0
    for ar in agent_results:
        w = weights.get(ar.agent_name, 0)
        final_score += ar.overall_score * w
    final_score = round(final_score, 1)

    # Fit level
    if final_score >= 75:
        fit_level = "Strong"
    elif final_score >= 50:
        fit_level = "Moderate"
    else:
        fit_level = "Weak"

    # Collect all strengths/weaknesses for fallback
    all_strengths = []
    all_weaknesses = []
    for ar in agent_results:
        all_strengths.extend(ar.strengths)
        all_weaknesses.extend(ar.weaknesses)

    # --- Step 2: CrewAI qualitative synthesis (best-effort) ---
    try:
        qualitative = _run_synthesis_agent(
            final_score, fit_level, agent_results, all_strengths, all_weaknesses
        )
    except Exception as e:
        logger.warning(f"CrewAI synthesis failed, using mechanical fallback: {e}")
        qualitative = _mechanical_fallback(
            final_score, fit_level, all_strengths, all_weaknesses
        )

    report = ConsolidatedReport(
        candidate_id=candidate_id,
        job_id=job_id,
        final_score=final_score,
        fit_level=fit_level,
        agent_results=[ar.model_dump() for ar in agent_results],
        top_strengths=qualitative.get("top_strengths", all_strengths[:5]),
        key_concerns=qualitative.get("key_concerns", all_weaknesses[:4]),
        interview_focus_areas=qualitative.get("interview_focus_areas", []),
        summary=qualitative.get(
            "summary",
            f"Candidate scored {final_score}/100 ({fit_level} fit).",
        ),
    )
    return report.model_dump()


def _run_synthesis_agent(
    final_score: float,
    fit_level: str,
    agent_results: list[AgentResult],
    all_strengths: list[str],
    all_weaknesses: list[str],
) -> dict:
    """Run CrewAI agent to generate qualitative insights."""
    from crewai import Agent, Task, Crew, Process

    context = json.dumps(
        {
            "final_score": final_score,
            "fit_level": fit_level,
            "agent_results": [ar.model_dump() for ar in agent_results],
            "all_strengths": all_strengths,
            "all_weaknesses": all_weaknesses,
        },
        indent=2,
    )

    recruiter_agent = Agent(
        role="Senior Recruitment Advisor",
        goal="Synthesize multi-source candidate evaluation into actionable recruiter guidance",
        backstory=(
            "You are a senior recruitment advisor who synthesizes technical evaluations "
            "from multiple sources (ATS resume scoring, GitHub analysis, LeetCode performance) "
            "into clear, actionable guidance for recruiters. You connect the dots across "
            "different evaluation dimensions to provide holistic candidate insights."
        ),
        tools=[],
        verbose=False,
    )

    synthesis_task = Task(
        description=(
            f"Given this candidate evaluation data:\n\n{context}\n\n"
            "Synthesize the results into actionable recruiter guidance. "
            "Do NOT just copy strengths/weaknesses — synthesize across agents. "
            "Connect missing skills to actual job requirements. "
            "Suggest specific interview topics based on identified gaps.\n\n"
            "Return ONLY valid JSON (no markdown, no explanation outside the JSON):\n"
            "{\n"
            '  "top_strengths": ["3-5 synthesized strengths across all agents"],\n'
            '  "key_concerns": ["2-4 concerns connecting gaps to job requirements"],\n'
            '  "interview_focus_areas": ["3-5 specific interview topics/questions based on gaps"],\n'
            '  "summary": "2-3 sentence recruiter-friendly blurb"\n'
            "}"
        ),
        expected_output="Valid JSON with top_strengths, key_concerns, interview_focus_areas, summary",
        agent=recruiter_agent,
    )

    crew = Crew(
        agents=[recruiter_agent],
        tasks=[synthesis_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    raw = result.raw.strip()

    # Parse JSON from output
    import re
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        return json.loads(match.group())
    return json.loads(raw)


def _mechanical_fallback(
    final_score: float,
    fit_level: str,
    all_strengths: list[str],
    all_weaknesses: list[str],
) -> dict:
    """Fallback when CrewAI synthesis fails. Returns deterministic defaults."""
    return {
        "top_strengths": all_strengths[:5],
        "key_concerns": all_weaknesses[:4],
        "interview_focus_areas": [],
        "summary": f"Candidate scored {final_score}/100 ({fit_level} fit). "
        "Automated synthesis unavailable — review individual agent reports for details.",
    }
