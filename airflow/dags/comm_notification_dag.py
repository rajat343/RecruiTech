"""
RecruiTech Communication Notification DAG

Triggered via Airflow REST API by Kafka consumer (kafka_trigger.py).
Sends HTML emails for: candidate_registered, candidate_shortlisted, candidate_rejected.

Expected DAG conf:
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

DAG dependency:
  validate_inputs >> send_email >> publish_feedback_request
"""

import json
import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from airflow import DAG
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

VALID_TYPES = {"candidate_registered", "candidate_shortlisted", "candidate_rejected"}

default_args = {
    "owner": "recruitech",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=30),
}


def validate_inputs_fn(**context):
    """Validate notification payload from DAG conf."""
    conf = context["dag_run"].conf or {}
    logger.info(f"Comm notification conf: {json.dumps(conf, default=str)}")

    notification_type = conf.get("notification_type")
    if notification_type not in VALID_TYPES:
        raise ValueError(
            f"Invalid notification_type: {notification_type}. Must be one of {VALID_TYPES}"
        )

    required = ["candidate_id", "candidate_name", "candidate_email"]
    if notification_type in ("candidate_shortlisted", "candidate_rejected"):
        required.extend(["job_id", "job_title"])

    missing = [f for f in required if not conf.get(f)]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    return conf


def send_email_fn(**context):
    """Construct HTML email and send via Gmail SMTP."""
    from utils.email_templates import get_email_subject_and_body
    from utils.config import GMAIL_USER, GMAIL_APP_PASSWORD

    ti = context["ti"]
    payload = ti.xcom_pull(task_ids="validate_inputs")

    notification_type = payload["notification_type"]
    candidate_email = payload["candidate_email"]

    subject, html_body = get_email_subject_and_body(notification_type, payload)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"RecruiTech <{GMAIL_USER}>"
    msg["To"] = candidate_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_USER, candidate_email, msg.as_string())

    logger.info(f"Email sent to {candidate_email} for {notification_type}")


def publish_feedback_request_fn(**context):
    """Publish rejection-feedback Kafka message and create placeholder in MongoDB.

    Only runs for candidate_rejected notifications. Skips silently for other types.
    """
    import pymongo
    from kafka import KafkaProducer
    from utils.config import KAFKA_BOOTSTRAP_SERVERS, MONGODB_URL

    ti = context["ti"]
    payload = ti.xcom_pull(task_ids="validate_inputs")

    if payload["notification_type"] != "candidate_rejected":
        logger.info("Not a rejection notification, skipping feedback trigger.")
        return

    candidate_id = payload.get("candidate_id")
    job_id = payload.get("job_id")

    if not job_id:
        logger.warning("No job_id in rejection payload, skipping feedback trigger.")
        return

    # Insert placeholder document in MongoDB
    try:
        client = pymongo.MongoClient(MONGODB_URL)
        db = client.get_database()
        db["candidate_feedback"].update_one(
            {"candidate_id": candidate_id, "job_id": job_id},
            {"$setOnInsert": {
                "candidate_id": candidate_id,
                "job_id": job_id,
                "status": "generating",
                "feedback": None,
                "created_at": datetime.utcnow(),
            }},
            upsert=True,
        )
        client.close()
        logger.info(f"Created feedback placeholder for candidate={candidate_id}, job={job_id}")
    except Exception as e:
        logger.error(f"Failed to create feedback placeholder: {e}")

    # Publish to rejection-feedback Kafka topic
    try:
        feedback_msg = {
            "candidate_id": candidate_id,
            "candidate_name": payload.get("candidate_name", ""),
            "candidate_email": payload.get("candidate_email", ""),
            "job_id": job_id,
            "job_title": payload.get("job_title", ""),
            "company_name": payload.get("company_name", ""),
            "timestamp": datetime.utcnow().isoformat(),
        }

        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
        )
        producer.send("rejection-feedback", value=feedback_msg)
        producer.flush()
        producer.close()
        logger.info(f"Published to rejection-feedback topic for candidate={candidate_id}")
    except Exception as e:
        logger.error(f"Failed to publish rejection-feedback message: {e}")


with DAG(
    dag_id="comm_notification",
    default_args=default_args,
    description="Send notification emails to candidates (registration, shortlisted, rejected)",
    schedule_interval=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["recruitech", "communication", "email"],
    max_active_runs=10,
    doc_md=__doc__,
) as dag:

    validate_inputs = PythonOperator(
        task_id="validate_inputs",
        python_callable=validate_inputs_fn,
        execution_timeout=timedelta(minutes=1),
    )

    send_email = PythonOperator(
        task_id="send_email",
        python_callable=send_email_fn,
        execution_timeout=timedelta(minutes=2),
    )

    publish_feedback_request = PythonOperator(
        task_id="publish_feedback_request",
        python_callable=publish_feedback_request_fn,
        execution_timeout=timedelta(minutes=2),
    )

    validate_inputs >> send_email >> publish_feedback_request
