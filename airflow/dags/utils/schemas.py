"""Standardized schemas for inter-task communication via XCom."""
from typing import Optional

from pydantic import BaseModel, Field


class CategoryScore(BaseModel):
    category: str
    score: float = Field(ge=0, le=100)
    weight: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = []


class AgentResult(BaseModel):
    agent_name: str  # "github_analyzer" | "leetcode_analyzer" | "ats_scorer"
    category_scores: list[CategoryScore]
    overall_score: float = Field(ge=0, le=100)
    strengths: list[str] = []
    weaknesses: list[str] = []


class ConsolidatedReport(BaseModel):
    candidate_id: str
    job_id: str
    final_score: float = Field(ge=0, le=100)
    fit_level: str  # "Strong" | "Moderate" | "Weak"
    agent_results: list[dict]
    top_strengths: list[str] = []
    key_concerns: list[str] = []
    interview_focus_areas: list[str] = []
    summary: str = ""


class DAGInputs(BaseModel):
    candidate_id: str
    job_id: str
    job_description: str
    resume_s3_url: str
    resume_text: str
    github_url: Optional[str] = None
    leetcode_url: Optional[str] = None
