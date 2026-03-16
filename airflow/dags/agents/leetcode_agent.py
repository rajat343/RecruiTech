"""LeetCode agent wrapper for Airflow. Produces standardized AgentResult or None."""
import json
import logging
import re

from crewai import Agent, Task, Crew, Process

from tools.leetcode_graphql_tool import LeetCodeGraphQLTool, extract_leetcode_username
from utils.schemas import AgentResult, CategoryScore

logger = logging.getLogger(__name__)


def run_leetcode_agent(leetcode_url: str, job_description: str) -> dict | None:
    """
    Analyze a LeetCode profile. Returns AgentResult dict or None if no URL.
    """
    if not leetcode_url:
        logger.info("No LeetCode URL provided. Skipping LeetCode analysis.")
        return None

    try:
        username = extract_leetcode_username(leetcode_url)
    except Exception as e:
        logger.error(f"Failed to extract LeetCode username from {leetcode_url}: {e}")
        return None

    leetcode_tool = LeetCodeGraphQLTool()

    # Fetch raw LeetCode data (non-LLM call)
    try:
        raw_leetcode_data = leetcode_tool._run(username)
        if isinstance(raw_leetcode_data, str) and raw_leetcode_data.startswith("Error"):
            logger.error(f"LeetCode data fetch failed: {raw_leetcode_data}")
            return None
    except Exception as e:
        logger.error(f"LeetCode tool execution failed: {e}")
        return None

    # CrewAI agent to analyze
    analyst = Agent(
        role="Algorithmic Skills Evaluator",
        goal="Evaluate candidate's algorithmic and problem-solving skills from their LeetCode profile and provide structured JSON scoring",
        backstory=(
            "You are a technical interviewer who specializes in evaluating algorithmic skills. "
            "You assess LeetCode profiles to gauge problem-solving depth, consistency, and breadth."
        ),
        tools=[],
        verbose=False,
    )

    task_description = (
        f"Analyze this LeetCode profile data:\n\n{raw_leetcode_data}\n\n"
        f"Against this job description:\n\n--- JOB DESCRIPTION ---\n{job_description}\n--- END ---\n\n"
        "Return your analysis as ONLY valid JSON (no markdown, no explanation outside the JSON):\n"
        "{\n"
        '  "problem_solving_score": <0-100 integer>,\n'
        '  "problem_solving_evidence": ["evidence1", "evidence2"],\n'
        '  "consistency_score": <0-100 integer>,\n'
        '  "consistency_evidence": ["evidence1", "evidence2"],\n'
        '  "difficulty_distribution_score": <0-100 integer>,\n'
        '  "difficulty_distribution_evidence": ["evidence1", "evidence2"],\n'
        '  "overall_score": <0-100 integer>,\n'
        '  "strengths": ["strength1", "strength2"],\n'
        '  "weaknesses": ["weakness1", "weakness2"]\n'
        "}\n"
    )

    analysis_task = Task(
        description=task_description,
        expected_output="Valid JSON with problem_solving_score, consistency_score, difficulty_distribution_score, overall_score, strengths, weaknesses",
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

    # Parse output
    try:
        parsed = _parse_json(raw_output)
    except Exception as e:
        logger.warning(f"Failed to parse LeetCode CrewAI output as JSON, using fallback: {e}")
        parsed = _fallback_parse(raw_output)

    agent_result = AgentResult(
        agent_name="leetcode_analyzer",
        category_scores=[
            CategoryScore(
                category="problem_solving",
                score=_clamp(parsed.get("problem_solving_score", 50)),
                weight=0.45,
                evidence=parsed.get("problem_solving_evidence", [])[:5],
            ),
            CategoryScore(
                category="consistency",
                score=_clamp(parsed.get("consistency_score", 50)),
                weight=0.25,
                evidence=parsed.get("consistency_evidence", [])[:5],
            ),
            CategoryScore(
                category="difficulty_distribution",
                score=_clamp(parsed.get("difficulty_distribution_score", 50)),
                weight=0.30,
                evidence=parsed.get("difficulty_distribution_evidence", [])[:5],
            ),
        ],
        overall_score=_clamp(parsed.get("overall_score", 50)),
        strengths=parsed.get("strengths", [])[:5],
        weaknesses=parsed.get("weaknesses", [])[:5],
    )
    return agent_result.model_dump()


def _clamp(value, lo=0, hi=100):
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return 50


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
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
                    f"Extract structured scores from this LeetCode analysis:\n\n{raw[:3000]}\n\n"
                    "Return JSON: {\"problem_solving_score\": 0-100, \"problem_solving_evidence\": [], "
                    "\"consistency_score\": 0-100, \"consistency_evidence\": [], "
                    "\"difficulty_distribution_score\": 0-100, \"difficulty_distribution_evidence\": [], "
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
            "problem_solving_score": 50,
            "consistency_score": 50,
            "difficulty_distribution_score": 50,
            "overall_score": 50,
            "strengths": ["Unable to parse detailed analysis"],
            "weaknesses": ["Analysis parsing failed — manual review recommended"],
        }
