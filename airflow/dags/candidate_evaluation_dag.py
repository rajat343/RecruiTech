"""
RecruiTech Candidate Evaluation DAG

Triggered via Airflow REST API by Kafka consumer (kafka_trigger.py).

Expected DAG conf (passed via REST API):
{
    "candidate_id": "abc123",
    "job_id": "job456",
    "job_description": "We are looking for a senior Python developer...",
    "resume_s3_url": "s3://recruitech-resumes/abc123/resume.pdf",
    "github_url": "https://github.com/username",        # optional
    "leetcode_url": "https://leetcode.com/u/username"   # optional
}

DAG dependency:
  extract_inputs >> [github_agent, leetcode_agent, ats_scorer] >> consolidation >> persist_and_notify
"""
import json
import logging
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

default_args = {
    "owner": "recruitech",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 0,
    "retry_delay": timedelta(minutes=1),
}


# ---------------------------------------------------------------------------
# Task functions
# ---------------------------------------------------------------------------


def extract_inputs_fn(**context):
    """Validate inputs and fetch resume text from S3."""
    from utils.s3_resume_loader import get_resume_text_from_s3
    from utils.schemas import DAGInputs

    conf = context["dag_run"].conf or {}
    logger.info(f"DAG conf received: {json.dumps(conf, default=str)}")

    candidate_id = conf.get("candidate_id")
    job_id = conf.get("job_id")
    job_description = conf.get("job_description")
    resume_s3_url = conf.get("resume_s3_url")

    if not all([candidate_id, job_id, job_description, resume_s3_url]):
        raise ValueError(
            f"Missing required fields. Got: candidate_id={candidate_id}, "
            f"job_id={job_id}, jd={'yes' if job_description else 'no'}, "
            f"resume_url={'yes' if resume_s3_url else 'no'}"
        )

    resume_text = get_resume_text_from_s3(resume_s3_url)
    if not resume_text or len(resume_text.strip()) < 50:
        raise ValueError(f"Resume text too short or empty from {resume_s3_url}")

    inputs = DAGInputs(
        candidate_id=str(candidate_id),
        job_id=str(job_id),
        job_description=job_description,
        resume_s3_url=resume_s3_url,
        resume_text=resume_text,
        github_url=conf.get("github_url") or None,
        leetcode_url=conf.get("leetcode_url") or None,
    )

    return inputs.model_dump()


def github_agent_fn(**context):
    """Run GitHub analysis agent. Returns None if no URL."""
    from agents.github_agent import run_github_agent

    ti = context["ti"]
    inputs = ti.xcom_pull(task_ids="extract_inputs")

    return run_github_agent(
        github_url=inputs.get("github_url"),
        job_description=inputs["job_description"],
    )


def leetcode_agent_fn(**context):
    """Run LeetCode analysis agent. Returns None if no URL."""
    from agents.leetcode_agent import run_leetcode_agent

    ti = context["ti"]
    inputs = ti.xcom_pull(task_ids="extract_inputs")

    return run_leetcode_agent(
        leetcode_url=inputs.get("leetcode_url"),
        job_description=inputs["job_description"],
    )


def ats_scorer_fn(**context):
    """Run ATS scorer (Drishti's scorer.py)."""
    from agents.ats_scorer_agent import run_ats_scorer

    ti = context["ti"]
    inputs = ti.xcom_pull(task_ids="extract_inputs")

    return run_ats_scorer(
        job_description=inputs["job_description"],
        resume_text=inputs["resume_text"],
    )


def consolidation_fn(**context):
    """Consolidate all agent results."""
    from agents.consolidation_agent import consolidate

    ti = context["ti"]
    inputs = ti.xcom_pull(task_ids="extract_inputs")
    github_result = ti.xcom_pull(task_ids="github_agent")
    leetcode_result = ti.xcom_pull(task_ids="leetcode_agent")
    ats_result = ti.xcom_pull(task_ids="ats_scorer")

    return consolidate(
        candidate_id=inputs["candidate_id"],
        job_id=inputs["job_id"],
        job_description=inputs["job_description"],
        github_result=github_result,
        ats_result=ats_result,
        leetcode_result=leetcode_result,
    )


def persist_and_notify_fn(**context):
    """Write results to MongoDB and produce Kafka message."""
    import pymongo
    from kafka import KafkaProducer
    from utils.config import (
        KAFKA_BOOTSTRAP_SERVERS,
        KAFKA_EVALUATION_COMPLETE_TOPIC,
        MONGODB_URL,
    )

    ti = context["ti"]
    report = ti.xcom_pull(task_ids="consolidation")

    # --- Persist to MongoDB ---
    try:
        client = pymongo.MongoClient(MONGODB_URL)
        db = client.get_database()
        evaluations = db["evaluations"]
        doc = {
            **report,
            "created_at": datetime.utcnow(),
            "dag_run_id": context["dag_run"].run_id,
        }
        result = evaluations.insert_one(doc)
        logger.info(f"Persisted evaluation to MongoDB: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Failed to persist to MongoDB: {e}")
        raise

    # --- Produce to Kafka ---
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
        )
        producer.send(
            KAFKA_EVALUATION_COMPLETE_TOPIC,
            value={
                "candidate_id": report["candidate_id"],
                "job_id": report["job_id"],
                "final_score": report["final_score"],
                "fit_level": report["fit_level"],
                "dag_run_id": context["dag_run"].run_id,
                "summary": report["summary"],
            },
        )
        producer.flush()
        producer.close()
        logger.info(f"Published to {KAFKA_EVALUATION_COMPLETE_TOPIC}")
    except Exception as e:
        logger.error(f"Failed to publish to Kafka: {e}")
        raise


# ---------------------------------------------------------------------------
# LLM task common kwargs
# ---------------------------------------------------------------------------

llm_task_kwargs = {
    "pool": "llm_pool",
    "retries": 3,
    "retry_delay": timedelta(seconds=30),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=10),
}


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------

with DAG(
    dag_id="candidate_evaluation",
    default_args=default_args,
    description="Evaluate candidate fit using GitHub, LeetCode, and ATS scoring agents",
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["recruitech", "candidate-evaluation", "agents"],
    max_active_runs=5,
    doc_md=__doc__,
) as dag:

    extract_inputs = PythonOperator(
        task_id="extract_inputs",
        python_callable=extract_inputs_fn,
        execution_timeout=timedelta(minutes=2),
    )

    github_agent = PythonOperator(
        task_id="github_agent",
        python_callable=github_agent_fn,
        **llm_task_kwargs,
    )

    leetcode_agent = PythonOperator(
        task_id="leetcode_agent",
        python_callable=leetcode_agent_fn,
        **llm_task_kwargs,
    )

    ats_scorer = PythonOperator(
        task_id="ats_scorer",
        python_callable=ats_scorer_fn,
        **llm_task_kwargs,
    )

    consolidation = PythonOperator(
        task_id="consolidation",
        python_callable=consolidation_fn,
        **llm_task_kwargs,
    )

    persist_and_notify = PythonOperator(
        task_id="persist_and_notify",
        python_callable=persist_and_notify_fn,
        retries=2,
        retry_delay=timedelta(seconds=10),
        execution_timeout=timedelta(minutes=2),
    )

    # Dependencies
    extract_inputs >> [github_agent, leetcode_agent, ats_scorer] >> consolidation >> persist_and_notify
