"""
Lightweight Kafka consumer that triggers Airflow DAG runs.
Runs outside Airflow — on the host or in a separate container.

Listens to: candidate-evaluation-request
Triggers:   candidate_evaluation DAG via Airflow REST API

Expected Kafka message:
{
    "candidate_id": "abc123",
    "job_id": "job456",
    "job_description": "...",
    "resume_s3_url": "s3://...",
    "github_url": "https://github.com/...",     # optional
    "leetcode_url": "https://leetcode.com/..."   # optional
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
KAFKA_TOPIC = os.environ.get("KAFKA_INPUT_TOPIC", "candidate-evaluation-request")
KAFKA_GROUP = os.environ.get("KAFKA_GROUP_ID", "airflow-dag-trigger")
AIRFLOW_BASE_URL = os.environ.get("AIRFLOW_BASE_URL", "http://localhost:8080")
AIRFLOW_USER = os.environ.get("AIRFLOW_USER", "airflow")
AIRFLOW_PASS = os.environ.get("AIRFLOW_PASS", "airflow")
DAG_ID = "candidate_evaluation"


def trigger_dag(conf: dict) -> bool:
    """Trigger Airflow DAG via REST API."""
    url = f"{AIRFLOW_BASE_URL}/api/v1/dags/{DAG_ID}/dagRuns"
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
            logger.info(f"DAG triggered: {resp.json().get('dag_run_id')}")
            return True
        else:
            logger.error(f"DAG trigger failed: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"DAG trigger error: {e}")
        return False


def main():
    logger.info(f"Connecting to Kafka at {KAFKA_BOOTSTRAP}, topic: {KAFKA_TOPIC}")
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
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
    logger.info("Listening for candidate evaluation requests...")

    for message in consumer:
        try:
            payload = message.value
            if not payload:
                continue
            logger.info(
                f"Received: candidate_id={payload.get('candidate_id')}, "
                f"job_id={payload.get('job_id')}"
            )

            required = ["candidate_id", "job_id", "job_description", "resume_s3_url"]
            missing = [f for f in required if not payload.get(f)]
            if missing:
                logger.error(f"Missing fields: {missing}. Skipping.")
                continue

            trigger_dag(payload)

        except Exception as e:
            logger.exception(f"Error processing message: {e}")


if __name__ == "__main__":
    main()
