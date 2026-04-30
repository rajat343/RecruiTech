"""
Lightweight Kafka consumer that triggers Airflow DAG runs.
Runs outside Airflow — on the host or in a separate container.

Listens to:
  - candidate-evaluation-request  → triggers candidate_evaluation DAG
  - comm-notification             → triggers comm_notification DAG
  - rejection-feedback            → triggers rejection_feedback DAG

Expected Kafka messages:

candidate-evaluation-request:
{
    "candidate_id": "abc123",
    "job_id": "job456",
    "job_description": "...",
    "resume_s3_url": "s3://...",
    "github_url": "https://github.com/...",     # optional
    "leetcode_url": "https://leetcode.com/..."   # optional
}

comm-notification:
{
    "notification_type": "candidate_registered|candidate_shortlisted|candidate_rejected",
    "candidate_id": "abc123",
    "candidate_name": "John Doe",
    "candidate_email": "john@example.com",
    "job_id": "job456",         # only for shortlisted/rejected
    "job_title": "...",         # only for shortlisted/rejected
    "company_name": "...",      # only for shortlisted/rejected
    "timestamp": "2026-04-18T10:30:00Z"
}

Usage:
    pip install kafka-python-ng requests
    export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
    python kafka_trigger.py
"""
import json
import logging
import os
from datetime import datetime

import requests
from kafka import KafkaConsumer

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_GROUP = os.environ.get("KAFKA_GROUP_ID", "airflow-dag-trigger")
AIRFLOW_BASE_URL = os.environ.get("AIRFLOW_BASE_URL", "http://localhost:8080")
AIRFLOW_USER = os.environ.get("AIRFLOW_USER", "airflow")
AIRFLOW_PASS = os.environ.get("AIRFLOW_PASS", "airflow")

# Topic → DAG routing map
KAFKA_TOPICS = {
    os.environ.get("KAFKA_INPUT_TOPIC", "candidate-evaluation-request"): "candidate_evaluation",
    os.environ.get("KAFKA_COMM_TOPIC", "comm-notification"): "comm_notification",
    os.environ.get("KAFKA_FEEDBACK_TOPIC", "rejection-feedback"): "rejection_feedback",
}


def trigger_dag(dag_id: str, conf: dict) -> bool:
    """Trigger Airflow DAG via REST API."""
    url = f"{AIRFLOW_BASE_URL}/api/v1/dags/{dag_id}/dagRuns"
    run_id = (
        f"kafka_{conf.get('candidate_id', 'unknown')}"
        f"_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
    )
    payload = {"conf": conf, "dag_run_id": run_id}
    try:
        resp = requests.post(
            url,
            json=payload,
            auth=(AIRFLOW_USER, AIRFLOW_PASS),
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if resp.status_code in (200, 201):
            logger.info(f"DAG {dag_id} triggered: {resp.json().get('dag_run_id')}")
            return True
        else:
            logger.error(f"DAG {dag_id} trigger failed: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"DAG {dag_id} trigger error: {e}")
        return False


def validate_message(topic: str, payload: dict) -> bool:
    """Validate message payload based on topic."""
    if topic == os.environ.get("KAFKA_INPUT_TOPIC", "candidate-evaluation-request"):
        required = ["candidate_id", "job_id", "job_description", "resume_s3_url"]
        missing = [f for f in required if not payload.get(f)]
        if missing:
            logger.error(f"Missing fields for evaluation: {missing}. Skipping.")
            return False
    elif topic == os.environ.get("KAFKA_COMM_TOPIC", "comm-notification"):
        if not payload.get("notification_type"):
            logger.error("Missing notification_type for comm notification. Skipping.")
            return False
    elif topic == os.environ.get("KAFKA_FEEDBACK_TOPIC", "rejection-feedback"):
        required = ["candidate_id", "job_id"]
        missing = [f for f in required if not payload.get(f)]
        if missing:
            logger.error(f"Missing fields for rejection feedback: {missing}. Skipping.")
            return False
    return True


def main():
    topics = list(KAFKA_TOPICS.keys())
    logger.info(f"Connecting to Kafka at {KAFKA_BOOTSTRAP}, topics: {topics}")
    consumer = KafkaConsumer(
        *topics,
        bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
        group_id=KAFKA_GROUP,
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")) if m else None,
        enable_auto_commit=True,
        session_timeout_ms=30000,
        heartbeat_interval_ms=10000,
        reconnect_backoff_ms=1000,
        reconnect_backoff_max_ms=30000,
        request_timeout_ms=40000,
    )
    logger.info(f"Listening on topics: {topics}")

    for message in consumer:
        try:
            payload = message.value
            if not payload:
                continue

            topic = message.topic
            dag_id = KAFKA_TOPICS.get(topic)
            if not dag_id:
                logger.warning(f"Unknown topic: {topic}. Skipping.")
                continue

            logger.info(
                f"Received on {topic}: {json.dumps(payload, default=str)[:200]}"
            )

            if not validate_message(topic, payload):
                continue

            trigger_dag(dag_id, payload)

        except Exception as e:
            logger.exception(f"Error processing message: {e}")


if __name__ == "__main__":
    main()
