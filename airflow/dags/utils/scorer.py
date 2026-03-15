"""ATS-style resume vs JD scoring using OpenAI (gpt-4o-mini)."""
import json
import re

from utils.config import LLM_MAX_TOKENS, OPENAI_API_KEY, OPENAI_MODEL

SCORING_PROMPT = """
You are a senior technical recruiter and an ATS (Applicant Tracking System) used by companies to screen software engineering candidates.

Your task is to evaluate how well a candidate's resume matches a job description.

Be STRICT and realistic. Only give high scores if the resume clearly demonstrates the required skills through real work experience or projects.

--------------------------------------------------

STEP 1: Extract from the JOB DESCRIPTION:
- required_skills
- preferred_skills
- minimum_experience
- education_requirements

STEP 2: Extract from the RESUME:
- skills_section
- work_experience
- projects
- education

--------------------------------------------------

STEP 3: SCORING RULES

Score the resume using this rubric:

Skills Match (0–40)
Experience Relevance (0–30)
Projects (0–20)
Education (0–10)

Total Score = sum (max 100)

IMPORTANT EVALUATION RULES:

1. Skills mentioned ONLY in the "Skills" section are WEAK evidence.

2. Skills demonstrated in "Work Experience" are STRONG evidence.

3. Skills demonstrated in "Projects" are MEDIUM evidence.

4. If a required skill appears only in the Skills section but not in experience/projects,
reduce its impact by 50%.

5. If a required skill does not appear anywhere in the resume,
include it in "missing_skills".

6. Do NOT assume skills that are not explicitly written.

7. Give higher scores when the candidate demonstrates practical use of skills
in work experience or projects.

--------------------------------------------------

STEP 4: Evidence Requirement

For every matched skill, ensure it actually appears in the resume text.
Do not hallucinate skills.

--------------------------------------------------

Return ONLY valid JSON.

Format:

{
  "skills_match_score": number,
  "experience_score": number,
  "projects_score": number,
  "education_score": number,
  "overall_score": number,
  "matched_skills": [],
  "missing_skills": [],
  "strengths": [],
  "weaknesses": [],
  "explanation": ""
}

--------------------------------------------------

JOB DESCRIPTION:
<<JD>>

--------------------------------------------------

RESUME:
<<RESUME>>
"""


def _call_openai(jd: str, resume_text: str) -> dict:
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)
    prompt = (
        SCORING_PROMPT.replace("<<JD>>", jd)
        .replace("<<RESUME>>", resume_text)
    )
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You return only valid JSON. No markdown, no code fences."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=LLM_MAX_TOKENS,
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    return _parse_json(raw)


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    # Remove markdown code fence if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
    return json.loads(raw)


def score_resume_vs_jd(jd: str, resume_text: str) -> dict:
    """
    Score resume against job description. Returns dict with keys:
    skills_match_score, experience_score, projects_score, education_score,
    overall_score, matched_skills, missing_skills, strengths, weaknesses, explanation.
    """
    if not jd or not resume_text:
        return {
            "skills_match_score": 0,
            "experience_score": 0,
            "projects_score": 0,
            "education_score": 0,
            "overall_score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "strengths": [],
            "weaknesses": [],
            "explanation": "Missing job description or resume text.",
        }
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    return _call_openai(jd, resume_text)
