# RecruiTech — Airflow

Local Airflow setup using Docker Compose (LocalExecutor + Postgres).

## Prerequisites

- Docker Desktop installed and running

## Setup

```bash
cd airflow

# Create env file from example
cp .env.example .env
# On Linux, update AIRFLOW_UID to your user ID: run `id -u`

# Initialize (one-time — creates DB + admin user)
docker compose up airflow-init

# Start Airflow
docker compose up -d
```

## Access

- **UI**: http://localhost:8080
- **Login**: airflow / airflow

## Verify

A test DAG (`test_dag`) should appear in the UI within 30 seconds. Trigger it manually and confirm it goes green.

## Common Commands

```bash
# Check services
docker compose ps

# View logs
docker compose logs airflow-scheduler --tail 50

# List DAGs
docker compose exec airflow-scheduler airflow dags list

# Stop
docker compose down

# Full reset
docker compose down --volumes --remove-orphans
```

## Troubleshooting

- **DAG not showing?** Hard refresh (`Cmd + Shift + R`) or try incognito
- **Scheduler errors?** `docker compose logs airflow-scheduler --tail 30 | grep -i error`
- **Port 8080 in use?** Change in docker-compose.yaml: `"8081:8080"`
