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
) -> dict:
    """Generate growth-oriented feedback for a rejected candidate.

    Args:
        evaluation: Full evaluation document from MongoDB (or None if not available).
        job_description: The job description text.
        job_title: The job title.
        job_skills: List of required skills from the job.

    Returns:
        dict with keys: summary, strengths, growth_areas, next_steps, encouragement.
    """
    if not evaluation:
        return _no_evaluation_fallback(job_title, job_skills)

    try:
        result = _run_feedback_agent(evaluation, job_description, job_title, job_skills)
        # Validate required keys
        required = ["summary", "strengths", "growth_areas", "next_steps", "encouragement"]
        for key in required:
            if key not in result:
                logger.warning(f"Missing key '{key}' in CrewAI output, using fallback")
                return _mechanical_fallback(evaluation, job_title, job_skills)
        return result
    except Exception as e:
        logger.warning(f"CrewAI feedback generation failed, using mechanical fallback: {e}")
        return _mechanical_fallback(evaluation, job_title, job_skills)


def _run_feedback_agent(
    evaluation: dict,
    job_description: str,
    job_title: str,
    job_skills: list[str],
) -> dict:
    """Run CrewAI agent to generate growth-oriented feedback."""
    from crewai import Agent, Task, Crew, Process
    from utils.config import OPENAI_API_KEY, OPENAI_MODEL

    context = json.dumps(
        {
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
        },
        indent=2,
    )

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

    feedback_task = Task(
        description=(
            f"Given this candidate evaluation data and job requirements:\n\n{context}\n\n"
            "Generate a growth-oriented feedback report for the candidate.\n\n"
            "CRITICAL RULES:\n"
            "- NEVER mention rejection, not being selected, or any hiring decision\n"
            "- NEVER say 'despite your strengths', 'although you were qualified', or 'unfortunately'\n"
            "- NEVER reference scores or numerical ratings\n"
            "- Frame EVERYTHING as forward-looking growth opportunities\n"
            "- Be SPECIFIC: reference actual skills from the JD and evaluation data\n"
            "- Use improvement-oriented language throughout\n"
            "- Make suggestions actionable and concrete\n\n"
            "Return ONLY valid JSON (no markdown, no explanation outside the JSON):\n"
            "{\n"
            '  "summary": "2-3 sentence encouraging overview of the candidate\'s profile and growth direction. '
            "Do NOT mention scores or rejection.\",\n"
            '  "strengths": ["3-5 specific things the candidate is doing well, '
            "referencing actual evaluated data and JD requirements\"],\n"
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
            "Generate 3-5 growth_areas based on the evaluation gaps and JD requirements."
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
) -> dict:
    """Deterministic fallback when CrewAI fails."""
    strengths = evaluation.get("top_strengths", [])[:4]
    concerns = evaluation.get("key_concerns", [])[:4]

    growth_areas = []
    for concern in concerns:
        growth_areas.append({
            "area": concern[:80] if len(concern) > 80 else concern,
            "current_level": "",
            "suggestion": f"Consider deepening your skills in this area to strengthen your profile for {job_title} roles.",
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

    return {
        "summary": (
            f"Your profile shows solid foundations with room to grow in areas "
            f"relevant to {job_title} roles. Here are some insights to help you "
            f"strengthen your candidacy for similar positions."
        ),
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
