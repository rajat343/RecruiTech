#!/bin/bash
# Railway Airflow Entrypoint
# Runs Postgres (embedded), DB migration, admin user creation,
# scheduler (background), and webserver (foreground) in a single container.
#
# Required env vars:
#   AIRFLOW__DATABASE__SQL_ALCHEMY_CONN  (Railway Postgres reference variable)
#   PORT                                  (Railway assigns this automatically)

set -e

echo "=== RecruiTech Airflow: Railway Startup ==="

# Use Railway-assigned PORT (default 8080)
export AIRFLOW__WEBSERVER__WEB_SERVER_PORT="${PORT:-8080}"

# Run database migrations
echo "[1/5] Running database migrations..."
airflow db migrate

# Create admin user (idempotent)
echo "[2/5] Creating admin user..."
airflow users create \
    --username "${AIRFLOW_ADMIN_USER:-airflow}" \
    --password "${AIRFLOW_ADMIN_PASSWORD:-airflow}" \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@recruitech.com || true

# Create LLM pool
echo "[3/5] Creating LLM pool..."
airflow pools set llm_pool 3 "LLM rate limit pool" || true

# Start scheduler in background
echo "[4/5] Starting scheduler in background..."
airflow scheduler &

# Unpause DAGs after scheduler has time to register them
echo "[5/5] Unpausing DAGs in background (waiting 30s for scheduler)..."
(
    sleep 30
    airflow dags unpause candidate_evaluation 2>/dev/null || true
    airflow dags unpause comm_notification 2>/dev/null || true
    airflow dags unpause rejection_feedback 2>/dev/null || true
    echo "DAGs unpaused successfully."
) &

# Start webserver in foreground (keeps container alive)
exec airflow webserver --port "${AIRFLOW__WEBSERVER__WEB_SERVER_PORT}"
