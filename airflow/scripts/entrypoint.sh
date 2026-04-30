#!/bin/bash
# Run setup commands before starting the Airflow webserver.
# These are idempotent — safe to run on every container start.

set -e

# Wait for DB to be ready (airflow-init should have handled migration)
airflow db check

# Create LLM pool (limits concurrent agent calls)
airflow pools set llm_pool 3 "LLM rate limit pool" || true

# Unpause DAGs
airflow dags unpause candidate_evaluation 2>/dev/null || true
airflow dags unpause comm_notification 2>/dev/null || true
airflow dags unpause rejection_feedback 2>/dev/null || true

# Start the webserver
exec airflow webserver
