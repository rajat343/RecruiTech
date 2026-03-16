"""Consolidation: mechanical scoring + CrewAI qualitative summary.

Step 1 (always succeeds): pure Python weighted scoring with context-dependent weights.
Step 2 (best-effort): CrewAI agent for qualitative insights.
If Step 2 fails, returns mechanical results with sensible defaults.
"""
import json
import logging
import re

from utils.schemas import AgentResult, ConsolidatedReport, WeightProfile

logger = logging.getLogger(__name__)

# Weight profiles — all combinations of available agents
WEIGHTS_ALL_DSA_RELEVANT = {
    "ats_scorer": 0.40,
    "github_analyzer": 0.35,
    "leetcode_analyzer": 0.25,
}
WEIGHTS_ALL_DSA_MINIMAL = {
    "ats_scorer": 0.45,
    "github_analyzer": 0.45,
    "leetcode_analyzer": 0.10,
}
WEIGHTS_NO_LEETCODE = {
    "ats_scorer": 0.55,
    "github_analyzer": 0.45,
}
WEIGHTS_NO_GITHUB = {
    "ats_scorer": 0.70,
    "leetcode_analyzer": 0.30,
}
WEIGHTS_ATS_ONLY = {
    "ats_scorer": 1.00,
}

# Keywords that signal DSA-heavy roles
DSA_KEYWORDS = [
    # Explicit DSA terms
    "algorithm", "algorithms", "data structure", "data structures",
    "competitive programming", "dsa",
    "time complexity", "space complexity",
    "dynamic programming", "trees", "graphs", "sorting",
    # Assessment platforms
    "leetcode", "hackerrank", "codeforces", "codesignal",
    # Hiring process signals
    "coding assessment", "coding challenge", "coding round",
    "coding test", "online assessment",
    # Role level signals
    "new grad", "new graduate", "entry level", "entry-level",
    "early career", "junior developer", "fresh graduate",
    "intern", "internship",
    # CS fundamentals
    "computer science fundamentals", "cs fundamentals",
    "quantitative",
]


def _determine_weight_profile(
    job_description: str, has_github: bool, has_leetcode: bool
) -> WeightProfile:
    """Determine weight profile based on available agents and JD keywords."""
    jd_lower = job_description.lower()
    matched_keywords = [kw for kw in DSA_KEYWORDS if kw in jd_lower]
    is_dsa = bool(matched_keywords)

    if not has_github and not has_leetcode:
        return WeightProfile(
            name="ats_only",
            reason="No GitHub or LeetCode profiles provided",
            weights={"ats": 1.00},
        )

    if not has_github:
        return WeightProfile(
            name="no_github",
            reason="No GitHub profile provided",
            weights={"ats": 0.70, "leetcode": 0.30},
        )

    if not has_leetcode:
        return WeightProfile(
            name="no_leetcode",
            reason="No LeetCode profile provided",
            weights={"ats": 0.55, "github": 0.45},
        )

    # All three agents available
    if is_dsa:
        return WeightProfile(
            name="dsa_relevant",
            reason=f"JD contains: {', '.join(matched_keywords[:5])}",
            weights={"ats": 0.40, "github": 0.35, "leetcode": 0.25},
        )

    return WeightProfile(
        name="dsa_minimal",
        reason="JD does not emphasize DSA/algorithms",
        weights={"ats": 0.45, "github": 0.45, "leetcode": 0.10},
    )


def _get_agent_weights(profile: WeightProfile) -> dict[str, float]:
    """Map weight profile to agent_name → weight dict."""
    mapping = {
        "ats_only": WEIGHTS_ATS_ONLY,
        "no_github": WEIGHTS_NO_GITHUB,
        "no_leetcode": WEIGHTS_NO_LEETCODE,
        "dsa_relevant": WEIGHTS_ALL_DSA_RELEVANT,
        "dsa_minimal": WEIGHTS_ALL_DSA_MINIMAL,
    }
    return mapping.get(profile.name, WEIGHTS_ALL_DSA_MINIMAL)


def consolidate(
    candidate_id: str,
    job_id: str,
    job_description: str,
    github_result: dict | None,
    ats_result: dict,
    leetcode_result: dict | None,
) -> dict:
    """
    Two-step consolidation:
    Step 1: Mechanical weighted scoring (pure Python, never fails).
    Step 2: CrewAI qualitative synthesis (best-effort, degrades gracefully).
    """
    # --- Step 1: Mechanical scoring ---
    has_github = github_result is not None
    has_leetcode = leetcode_result is not None
    weight_profile = _determine_weight_profile(job_description, has_github, has_leetcode)
    weights = _get_agent_weights(weight_profile)

    agent_results = [AgentResult(**ats_result)]
    if has_github:
        agent_results.append(AgentResult(**github_result))
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
            final_score, fit_level, weight_profile,
            job_description, agent_results,
            all_strengths, all_weaknesses,
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
        weight_profile=weight_profile.model_dump(),
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
    weight_profile: WeightProfile,
    job_description: str,
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
            "weight_profile": weight_profile.model_dump(),
            "job_description": job_description,
            "agent_results": [ar.model_dump() for ar in agent_results],
            "all_strengths": all_strengths,
            "all_weaknesses": all_weaknesses,
        },
        indent=2,
    )

    # Build weight-aware instructions
    weight_instructions = ""
    if weight_profile.name == "ats_only":
        weight_instructions = (
            "Only resume/ATS data was available (no GitHub or LeetCode). "
            "Do not mention GitHub or LeetCode gaps as concerns. "
            "Focus entirely on resume findings against the job description."
        )
    elif weight_profile.name == "no_github":
        weight_instructions = (
            "No GitHub data was available. Do not mention GitHub gaps as a concern. "
            "Focus on resume and LeetCode findings."
        )
    elif weight_profile.name == "no_leetcode":
        weight_instructions = (
            "No LeetCode data was available. Do not mention LeetCode gaps as a concern. "
            "Focus entirely on resume and GitHub findings."
        )
    elif weight_profile.name == "dsa_minimal":
        weight_instructions = (
            "IMPORTANT: LeetCode is weighted at only 10% for this role because the JD "
            "does not emphasize algorithms/DSA. Do NOT flag weak LeetCode performance as "
            "a key concern. Do NOT recommend DSA-heavy interview questions. Focus interview "
            "areas on practical skills relevant to the job description instead."
        )
    elif weight_profile.name == "dsa_relevant":
        weight_instructions = (
            "LeetCode is weighted at 25% because the JD emphasizes algorithms/DSA. "
            "LeetCode performance is relevant — include algorithmic skill gaps in concerns "
            "and suggest DSA interview topics where appropriate."
        )

    recruiter_agent = Agent(
        role="Senior Recruitment Advisor",
        goal="Synthesize multi-source candidate evaluation into actionable recruiter guidance",
        backstory=(
            "You are a senior recruitment advisor who synthesizes technical evaluations "
            "from multiple sources (ATS resume scoring, GitHub analysis, LeetCode performance) "
            "into clear, actionable guidance for recruiters. You connect the dots across "
            "different evaluation dimensions and tailor your advice to the specific role."
        ),
        tools=[],
        verbose=False,
    )

    synthesis_task = Task(
        description=(
            f"Given this candidate evaluation data:\n\n{context}\n\n"
            f"{weight_instructions}\n\n"
            "Synthesize the results into actionable recruiter guidance. "
            "Do NOT just copy strengths/weaknesses — synthesize across agents. "
            "Connect missing skills to SPECIFIC requirements from the job description. "
            "Reference actual JD requirements when writing strengths, concerns, and focus areas. "
            "Mention the weight context in the summary "
            "(e.g., 'LeetCode weighted at 15% given the senior nature of this role').\n\n"
            "Return ONLY valid JSON (no markdown, no explanation outside the JSON):\n"
            "{\n"
            '  "top_strengths": ["3-5 synthesized strengths referencing JD requirements"],\n'
            '  "key_concerns": ["2-4 concerns connecting gaps to specific JD requirements"],\n'
            '  "interview_focus_areas": ["3-5 specific interview topics/questions based on gaps and role needs"],\n'
            '  "summary": "2-3 sentence recruiter-friendly blurb including weight context"\n'
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
