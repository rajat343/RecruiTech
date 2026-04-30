"""
RecruiTech Rejection Feedback DAG

Triggered via Airflow REST API by Kafka consumer (kafka_trigger.py).
Generates growth-oriented feedback for rejected candidates using CrewAI.

Expected DAG conf:
{
    "candidate_id": "abc123",
    "candidate_name": "John Doe",
    "candidate_email": "john@example.com",
    "job_id": "job456",
    "job_title": "Senior Backend Engineer",
    "company_name": "Acme Corp",
    "timestamp": "2026-04-29T10:30:00Z"
}

DAG dependency:
  fetch_data >> generate_feedback >> persist_feedback
"""

import json
import logging
from datetime import datetime, timedelta

import pymongo
from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

default_args = {
    "owner": "recruitech",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 0,
}


def fetch_data_fn(**context):
    """Fetch evaluation and job data from MongoDB."""
    from utils.config import MONGODB_URL

    conf = context["dag_run"].conf or {}
    candidate_id = conf.get("candidate_id")
    job_id = conf.get("job_id")

    if not candidate_id or not job_id:
        raise ValueError(f"Missing candidate_id or job_id in DAG conf: {conf}")

    logger.info(f"Fetching data for candidate={candidate_id}, job={job_id}")

    client = pymongo.MongoClient(MONGODB_URL)
    db = client.get_database()

    # Fetch evaluation
    evaluation = db["evaluations"].find_one(
        {"candidate_id": candidate_id, "job_id": job_id},
        sort=[("created_at", pymongo.DESCENDING)],
    )

    # Fetch job for description and skills
    from bson import ObjectId
    try:
        job = db["jobs"].find_one({"_id": ObjectId(job_id)})
    except Exception:
        job = db["jobs"].find_one({"_id": job_id})

    client.close()

    # Clean evaluation for XCom (remove ObjectId)
    eval_data = None
    if evaluation:
        evaluation.pop("_id", None)
        eval_data = json.loads(json.dumps(evaluation, default=str))
        logger.info(f"Found evaluation with score={evaluation.get('final_score')}")
    else:
        logger.warning(f"No evaluation found for candidate={candidate_id}, job={job_id}")

    job_description = ""
    job_title = conf.get("job_title", "")
    job_skills = []
    if job:
        job_description = job.get("description", "")
        job_title = job.get("title", job_title)
        job_skills = job.get("skills", [])

    return {
        "candidate_id": candidate_id,
        "candidate_name": conf.get("candidate_name", ""),
        "job_id": job_id,
        "job_title": job_title,
        "job_description": job_description,
        "job_skills": job_skills,
        "evaluation": eval_data,
    }


def generate_feedback_fn(**context):
    """Generate growth-oriented feedback using CrewAI."""
    from agents.feedback_agent import generate_rejection_feedback

    ti = context["ti"]
    data = ti.xcom_pull(task_ids="fetch_data")

    logger.info(
        f"Generating feedback for candidate={data['candidate_id']}, "
        f"job={data['job_id']}, has_evaluation={data['evaluation'] is not None}"
    )

    feedback = generate_rejection_feedback(
        evaluation=data.get("evaluation"),
        job_description=data.get("job_description", ""),
        job_title=data.get("job_title", ""),
        job_skills=data.get("job_skills", []),
    )

    logger.info(f"Feedback generated with {len(feedback.get('growth_areas', []))} growth areas")

    return {
        "candidate_id": data["candidate_id"],
        "job_id": data["job_id"],
        "feedback": feedback,
    }


def persist_feedback_fn(**context):
    """Persist feedback to MongoDB candidate_feedback collection."""
    from utils.config import MONGODB_URL

    ti = context["ti"]
    data = ti.xcom_pull(task_ids="generate_feedback")

    candidate_id = data["candidate_id"]
    job_id = data["job_id"]
    feedback = data["feedback"]

    client = pymongo.MongoClient(MONGODB_URL)
    db = client.get_database()

    doc = {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "status": "ready",
        "feedback": feedback,
        "created_at": datetime.utcnow(),
        "dag_run_id": context["dag_run"].run_id,
    }

    result = db["candidate_feedback"].update_one(
        {"candidate_id": candidate_id, "job_id": job_id},
        {"$set": doc},
        upsert=True,
    )

    client.close()

    logger.info(
        f"Feedback persisted for candidate={candidate_id}, job={job_id}, "
        f"matched={result.matched_count}, modified={result.modified_count}"
    )


with DAG(
    dag_id="rejection_feedback",
    default_args=default_args,
    description="Generate growth-oriented feedback for rejected candidates using CrewAI",
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["recruitech", "feedback", "rejection"],
    max_active_runs=5,
    doc_md=__doc__,
) as dag:

    fetch_data = PythonOperator(
        task_id="fetch_data",
        python_callable=fetch_data_fn,
        execution_timeout=timedelta(minutes=2),
    )

    generate_feedback = PythonOperator(
        task_id="generate_feedback",
        python_callable=generate_feedback_fn,
        pool="llm_pool",
        retries=3,
        retry_delay=timedelta(seconds=30),
        retry_exponential_backoff=True,
        max_retry_delay=timedelta(minutes=5),
        execution_timeout=timedelta(minutes=10),
    )

    persist_feedback = PythonOperator(
        task_id="persist_feedback",
        python_callable=persist_feedback_fn,
        retries=2,
        retry_delay=timedelta(seconds=10),
        execution_timeout=timedelta(minutes=2),
    )

    fetch_data >> generate_feedback >> persist_feedback
