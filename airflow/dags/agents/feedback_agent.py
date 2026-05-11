"""Rejection feedback agent: generates growth-oriented feedback for rejected candidates.

Uses CrewAI to produce candidate-friendly feedback based on evaluation data and JD.
Falls back to mechanical feedback if CrewAI fails.
"""

import json
import logging
import re

logger = logging.getLogger(__name__)


def generate_rejection_feedback(
    evaluation: dict | None,
    job_description: str,
    job_title: str,
    job_skills: list[str],
    interview_feedback: dict | None = None,
) -> dict:
    """Generate growth-oriented feedback for a rejected candidate.

    Args:
        evaluation: Full evaluation document from MongoDB (or None if not available).
        job_description: The job description text.
        job_title: The job title.
        job_skills: List of required skills from the job.
        interview_feedback: Optional dict from completed AI interview with keys:
            overall_feedback (str), strengths (list[str]), improvements (list[str]).

    Returns:
        dict with keys: summary, strengths, growth_areas, next_steps, encouragement.
    """
    has_iv = bool(
        interview_feedback
        and (
            (interview_feedback.get("overall_feedback") or "").strip()
            or (interview_feedback.get("strengths") or [])
            or (interview_feedback.get("improvements") or [])
        )
    )

    if not evaluation and not has_iv:
        return _no_evaluation_fallback(job_title, job_skills)

    if not evaluation and has_iv:
        return _interview_only_fallback(interview_feedback, job_title, job_skills)

    try:
        result = _run_feedback_agent(
            evaluation,
            job_description,
            job_title,
            job_skills,
            interview_feedback if has_iv else None,
        )
        # Validate required keys
        required = ["summary", "strengths", "growth_areas", "next_steps", "encouragement"]
        for key in required:
            if key not in result:
                logger.warning(f"Missing key '{key}' in CrewAI output, using fallback")
                return _mechanical_fallback(
                    evaluation, job_title, job_skills, interview_feedback if has_iv else None
                )
        return result
    except Exception as e:
        logger.warning(f"CrewAI feedback generation failed, using mechanical fallback: {e}")
        return _mechanical_fallback(
            evaluation, job_title, job_skills, interview_feedback if has_iv else None
        )


def _run_feedback_agent(
    evaluation: dict,
    job_description: str,
    job_title: str,
    job_skills: list[str],
    interview_feedback: dict | None = None,
) -> dict:
    """Run CrewAI agent to generate growth-oriented feedback."""
    from crewai import Agent, Task, Crew, Process
    from utils.config import OPENAI_API_KEY, OPENAI_MODEL

    payload = {
        "job_title": job_title,
        "job_description": job_description,
        "job_skills": job_skills,
        "final_score": evaluation.get("final_score"),
        "fit_level": evaluation.get("fit_level"),
        "top_strengths": evaluation.get("top_strengths", []),
        "key_concerns": evaluation.get("key_concerns", []),
        "dimension_scores": evaluation.get("dimension_scores", []),
        "summary": evaluation.get("summary", ""),
        "agent_results": [
            {
                "agent_name": ar.get("agent_name"),
                "overall_score": ar.get("overall_score"),
                "strengths": ar.get("strengths", []),
                "weaknesses": ar.get("weaknesses", []),
            }
            for ar in evaluation.get("agent_results", [])
        ],
    }
    if interview_feedback:
        payload["interview_insights"] = {
            "overall_feedback": (interview_feedback.get("overall_feedback") or "")[:2500],
            "what_went_well_in_interview": interview_feedback.get("strengths") or [],
            "what_to_improve_from_interview": interview_feedback.get("improvements") or [],
        }

    context = json.dumps(payload, indent=2)

    feedback_agent = Agent(
        role="Career Development Advisor",
        goal=(
            "Generate growth-oriented feedback that helps candidates "
            "identify their development areas and actionable next steps"
        ),
        backstory=(
            "You are a career development advisor who reviews technical evaluation data "
            "and translates it into actionable, encouraging growth guidance. You never say "
            "'you were rejected', 'not selected', 'unfortunately', or 'did not meet requirements'. "
            "Instead, you focus entirely on what the candidate can do to strengthen their profile "
            "for similar roles. You are warm, specific, and constructive. You reference actual "
            "skills and technologies from the job description and evaluation data."
        ),
        tools=[],
        verbose=False,
    )

    interview_block = ""
    if interview_feedback:
        interview_block = (
            "\n\nINTERVIEW INSIGHTS (from the candidate's completed AI interview — you MUST weave these in):\n"
            "- Use `what_went_well_in_interview` to reinforce genuine positives in **summary** and **strengths** "
            "(phrase in your own words; do not sound like a score report).\n"
            "- Use `what_to_improve_from_interview` and themes from `overall_feedback` to inform **growth_areas** "
            "and **next_steps** (specific, actionable; still never mention rejection or numeric scores).\n"
            "- Do not contradict the interview insights; integrate them with the evaluation data.\n"
        )

    feedback_task = Task(
        description=(
            f"Given this candidate evaluation data and job requirements:\n\n{context}\n\n"
            f"{interview_block}"
            "Generate a growth-oriented feedback report for the candidate.\n\n"
            "CRITICAL RULES:\n"
            "- NEVER mention rejection, not being selected, or any hiring decision\n"
            "- NEVER say 'despite your strengths', 'although you were qualified', or 'unfortunately'\n"
            "- NEVER reference scores or numerical ratings\n"
            "- Frame EVERYTHING as forward-looking growth opportunities\n"
            "- Be SPECIFIC: reference actual skills from the JD and evaluation data"
            + (" and the interview insights when present\n" if interview_feedback else "\n")
            + "- Use improvement-oriented language throughout\n"
            "- Make suggestions actionable and concrete\n\n"
            "Return ONLY valid JSON (no markdown, no explanation outside the JSON):\n"
            "{\n"
            '  "summary": "2-3 sentence encouraging overview of the candidate\'s profile and growth direction. '
            "Do NOT mention scores or rejection.\",\n"
            '  "strengths": ["3-5 specific things the candidate is doing well, '
            "referencing actual evaluated data and JD requirements"
            + ("; include what went well in the AI interview when interview_insights exist" if interview_feedback else "")
            + "\"],\n"
            '  "growth_areas": [\n'
            "    {\n"
            '      "area": "Area name (e.g., \'Cloud Infrastructure Skills\')",\n'
            '      "current_level": "Brief description of where they are now based on evaluation",\n'
            '      "suggestion": "Specific actionable suggestion for improvement",\n'
            '      "resources": "Specific technologies, certifications, or practice areas to explore"\n'
            "    }\n"
            "  ],\n"
            '  "next_steps": ["3-4 concrete actionable steps the candidate can take '
            "to strengthen their profile for similar roles\"],\n"
            '  "encouragement": "A warm, genuine closing message (1-2 sentences). '
            "Do NOT mention the application or hiring process.\"\n"
            "}\n\n"
            "Generate 3-5 growth_areas based on the evaluation gaps and JD requirements"
            + (" and interview improvement themes when provided." if interview_feedback else ".")
        ),
        expected_output=(
            "Valid JSON with summary, strengths, growth_areas, next_steps, encouragement"
        ),
        agent=feedback_agent,
    )

    crew = Crew(
        agents=[feedback_agent],
        tasks=[feedback_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    raw = result.raw.strip()

    # Parse JSON from output (same pattern as consolidation_agent.py)
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        return json.loads(match.group())
    return json.loads(raw)


def _mechanical_fallback(
    evaluation: dict,
    job_title: str,
    job_skills: list[str],
    interview_feedback: dict | None = None,
) -> dict:
    """Deterministic fallback when CrewAI fails."""
    strengths = list(evaluation.get("top_strengths", [])[:4])
    if interview_feedback:
        for s in (interview_feedback.get("strengths") or [])[:6]:
            t = (s or "").strip()
            if t and t not in strengths:
                strengths.append(t)
    concerns = list(evaluation.get("key_concerns", [])[:4])

    growth_areas = []
    for concern in concerns:
        growth_areas.append({
            "area": concern[:80] if len(concern) > 80 else concern,
            "current_level": "",
            "suggestion": f"Consider deepening your skills in this area to strengthen your profile for {job_title} roles.",
            "resources": "",
        })

    if interview_feedback:
        for imp in (interview_feedback.get("improvements") or [])[:6]:
            t = (imp or "").strip()
            if not t:
                continue
            growth_areas.append({
                "area": "From your AI interview",
                "current_level": "",
                "suggestion": t,
                "resources": "",
            })

    # Add skill-based growth areas if we have JD skills
    if job_skills and len(growth_areas) < 3:
        growth_areas.append({
            "area": "Technical Skills Alignment",
            "current_level": "Some skills match the role requirements",
            "suggestion": f"Focus on building proficiency in: {', '.join(job_skills[:5])}",
            "resources": "Online courses, documentation, and personal projects using these technologies",
        })

    summary = (
        f"Your profile shows solid foundations with room to grow in areas "
        f"relevant to {job_title} roles. Here are some insights to help you "
        f"strengthen your candidacy for similar positions."
    )
    if interview_feedback and (interview_feedback.get("overall_feedback") or "").strip():
        iv_note = (interview_feedback.get("overall_feedback") or "").strip()
        summary = (iv_note[:500] + ("…" if len(iv_note) > 500 else "")) + " " + summary

    return {
        "summary": summary.strip(),
        "strengths": strengths if strengths else [
            "You took the initiative to apply and showcase your skills",
            "Your profile is active on the RecruiTech platform",
        ],
        "growth_areas": growth_areas if growth_areas else [{
            "area": "Profile Enhancement",
            "current_level": "Your profile covers the basics",
            "suggestion": "Add more detail to your profile including projects, certifications, and specific technical skills",
            "resources": "GitHub projects, online certifications, technical blog posts",
        }],
        "next_steps": [
            "Continue building projects that demonstrate the skills listed in job descriptions you're targeting",
            "Consider contributing to open-source projects in your area of interest",
            "Keep your profile updated with new skills and experiences",
            "Explore other opportunities on RecruiTech that match your current skill set",
        ],
        "encouragement": (
            "Every application is a step forward in your career journey. "
            "Keep building, keep learning, and the right opportunity will come."
        ),
    }


def _interview_only_fallback(
    interview_feedback: dict,
    job_title: str,
    job_skills: list[str],
) -> dict:
    """When there is no evaluation document but we have AI interview feedback."""
    overall = (interview_feedback.get("overall_feedback") or "").strip()
    strengths = [s.strip() for s in (interview_feedback.get("strengths") or []) if (s or "").strip()]
    if not strengths:
        strengths = [
            "You completed the AI interview, which gives recruiters concrete signal on how you reason and communicate.",
        ]

    growth_areas = []
    for imp in (interview_feedback.get("improvements") or []):
        t = (imp or "").strip()
        if t:
            growth_areas.append({
                "area": "From your AI interview",
                "current_level": "",
                "suggestion": t,
                "resources": "",
            })

    if job_skills and len(growth_areas) < 2:
        growth_areas.append({
            "area": f"Skills for {job_title}",
            "current_level": "Aligning with typical role expectations",
            "suggestion": f"Continue building depth in: {', '.join(job_skills[:5])}",
            "resources": "Documentation, hands-on projects, and short courses in these areas",
        })

    if not growth_areas:
        growth_areas.append({
            "area": "Interview practice",
            "current_level": "",
            "suggestion": "Practice structuring answers with specific examples (what you did, why, and outcomes) for role-relevant scenarios.",
            "resources": "Mock interviews, STAR-style prep, and revisiting fundamentals from the job description",
        })

    if overall:
        summary = overall[:900] + ("…" if len(overall) > 900 else "")
    else:
        summary = (
            f"Here is feedback grounded in your AI interview for the {job_title} role. "
            "Use the strengths and growth areas below to keep improving for similar opportunities."
        )

    return {
        "summary": summary,
        "strengths": strengths,
        "growth_areas": growth_areas,
        "next_steps": [
            "Review the growth areas above and pick one or two to focus on over the next few weeks",
            "Add a small project or write-up that demonstrates the skills employers ask for in this type of role",
            "Keep your RecruiTech profile updated as you build new evidence of your skills",
            "Explore other open roles on RecruiTech that match where you are today",
        ],
        "encouragement": (
            "Interview practice is a skill—each session makes the next one easier. "
            "Keep going!"
        ),
    }


def _no_evaluation_fallback(job_title: str, job_skills: list[str]) -> dict:
    """Fallback when no evaluation data exists at all."""
    growth_areas = []
    if job_skills:
        growth_areas.append({
            "area": "Skills for " + job_title,
            "current_level": "Building towards role requirements",
            "suggestion": f"Focus on developing proficiency in: {', '.join(job_skills[:5])}",
            "resources": "Online courses, documentation, hands-on projects, and open-source contributions",
        })

    growth_areas.append({
        "area": "Portfolio & Visibility",
        "current_level": "Getting started",
        "suggestion": "Build public projects and contributions that showcase your technical abilities",
        "resources": "GitHub repositories, technical blog posts, open-source contributions",
    })

    return {
        "summary": (
            f"Thank you for your interest in the {job_title} role. "
            f"Here are some insights to help you strengthen your profile for similar positions."
        ),
        "strengths": [
            "You took the initiative to apply and put yourself forward",
            "Your profile is active on RecruiTech, opening doors to future opportunities",
        ],
        "growth_areas": growth_areas,
        "next_steps": [
            "Ensure your resume highlights relevant skills and quantifiable achievements",
            "Build projects that demonstrate skills listed in job descriptions you're targeting",
            "Keep your RecruiTech profile updated with latest skills and experiences",
            "Explore other open positions on RecruiTech that match your strengths",
        ],
        "encouragement": (
            "Your career is a journey, and every step forward counts. "
            "Keep sharpening your skills and exploring new opportunities!"
        ),
    }
