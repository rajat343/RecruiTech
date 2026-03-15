"""GitHub agent wrapper for Airflow. Produces standardized AgentResult."""
import json
import logging
import re

from crewai import Agent, Task, Crew, Process

from tools.github_graphql_tool import GitHubGraphQLTool
from utils.schemas import AgentResult, CategoryScore

logger = logging.getLogger(__name__)


def run_github_agent(github_url: str, job_description: str) -> dict:
    """
    Analyze a GitHub profile against a job description.
    Returns AgentResult dict with standardized scores.
    """
    username = github_url.rstrip("/").split("/")[-1]
    github_tool = GitHubGraphQLTool()

    analyst = Agent(
        role="Technical Recruiter Analyst",
        goal="Evaluate candidate GitHub profiles against job descriptions and provide structured JSON scoring",
        backstory=(
            "You are a senior technical recruiter with deep software engineering knowledge. "
            "You evaluate candidates by examining their GitHub profiles — repositories, "
            "tech stack, contributions, and activity — and compare them against job requirements "
            "to determine how well a candidate matches a role."
        ),
        tools=[github_tool],
        verbose=False,
    )

    task_description = (
        f"Use the GitHub GraphQL API tool to fetch the profile data for username '{username}'. "
        f"Then evaluate the candidate against the following job description:\n\n"
        f"--- JOB DESCRIPTION ---\n{job_description}\n--- END ---\n\n"
        "Steps:\n"
        f"1. Call the GitHub GraphQL API tool with username '{username}'\n"
        "2. Analyze the candidate's tech stack, top repositories, and contribution activity\n"
        "3. Compare their skills and experience against the job requirements\n"
        "4. Identify matching skills and skill gaps\n"
        "5. Score the candidate\n\n"
        "Return your analysis as ONLY valid JSON (no markdown, no explanation outside the JSON):\n"
        "{\n"
        '  "tech_stack_score": <0-100 integer>,\n'
        '  "tech_stack_evidence": ["evidence1", "evidence2"],\n'
        '  "contribution_score": <0-100 integer>,\n'
        '  "contribution_evidence": ["evidence1", "evidence2"],\n'
        '  "project_relevance_score": <0-100 integer>,\n'
        '  "project_relevance_evidence": ["evidence1", "evidence2"],\n'
        '  "overall_score": <0-100 integer>,\n'
        '  "strengths": ["strength1", "strength2"],\n'
        '  "weaknesses": ["weakness1", "weakness2"]\n'
        "}\n"
    )

    analysis_task = Task(
        description=task_description,
        expected_output="Valid JSON with tech_stack_score, contribution_score, project_relevance_score, overall_score, strengths, weaknesses",
        agent=analyst,
    )

    crew = Crew(
        agents=[analyst],
        tasks=[analysis_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    raw_output = result.raw

    # Parse into standardized format
    try:
        parsed = _parse_json(raw_output)
    except Exception as e:
        logger.warning(f"Failed to parse CrewAI output as JSON, using fallback: {e}")
        parsed = _fallback_parse(raw_output)

    agent_result = AgentResult(
        agent_name="github_analyzer",
        category_scores=[
            CategoryScore(
                category="tech_stack",
                score=_clamp(parsed.get("tech_stack_score", 50)),
                weight=0.40,
                evidence=parsed.get("tech_stack_evidence", [])[:5],
            ),
            CategoryScore(
                category="contributions",
                score=_clamp(parsed.get("contribution_score", 50)),
                weight=0.35,
                evidence=parsed.get("contribution_evidence", [])[:5],
            ),
            CategoryScore(
                category="project_relevance",
                score=_clamp(parsed.get("project_relevance_score", 50)),
                weight=0.25,
                evidence=parsed.get("project_relevance_evidence", [])[:5],
            ),
        ],
        overall_score=_clamp(parsed.get("overall_score", 50)),
        strengths=parsed.get("strengths", [])[:5],
        weaknesses=parsed.get("weaknesses", [])[:5],
    )
    return agent_result.model_dump()


def _clamp(value, lo=0, hi=100):
    """Clamp a numeric value to [lo, hi]."""
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return 50


def _parse_json(raw: str) -> dict:
    """Extract JSON from CrewAI output."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
    # Try to find JSON object in the output
    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        return json.loads(match.group())
    return json.loads(raw)


def _fallback_parse(raw: str) -> dict:
    """If JSON parsing fails, use OpenAI to extract structured scores."""
    from openai import OpenAI
    from utils.config import OPENAI_API_KEY, OPENAI_MODEL

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "Extract scores from the analysis. Return ONLY valid JSON, no other text."},
                {"role": "user", "content": (
                    f"Extract structured scores from this GitHub analysis:\n\n{raw[:3000]}\n\n"
                    "Return JSON: {\"tech_stack_score\": 0-100, \"tech_stack_evidence\": [], "
                    "\"contribution_score\": 0-100, \"contribution_evidence\": [], "
                    "\"project_relevance_score\": 0-100, \"project_relevance_evidence\": [], "
                    "\"overall_score\": 0-100, \"strengths\": [], \"weaknesses\": []}"
                )},
            ],
            max_tokens=512,
            temperature=0.1,
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"Fallback parse also failed: {e}")
        return {
            "tech_stack_score": 50,
            "contribution_score": 50,
            "project_relevance_score": 50,
            "overall_score": 50,
            "strengths": ["Unable to parse detailed analysis"],
            "weaknesses": ["Analysis parsing failed — manual review recommended"],
        }
