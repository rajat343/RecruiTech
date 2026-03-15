# RecruiTech — Airflow

Local Airflow setup using Docker Compose (LocalExecutor + Postgres).

## Prerequisites

- Docker Desktop installed and running

## Setup

```bash
# 1. Start Kafka first (Airflow depends on the kafka network)
cd kafka
docker compose up -d
cd ..

# 2. Start Airflow
cd airflow
cp .env.example .env   # first time only
# On Linux, update AIRFLOW_UID to your user ID: run `id -u`

docker compose up airflow-init   # one-time — creates DB + admin user
docker compose up -d
```

## Access

- **Airflow UI**: http://localhost:8080 (airflow / airflow)
- **Kafka UI**: http://localhost:8081 (runs from `kafka/` docker-compose)

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

## Candidate Evaluation Pipeline

### Additional Setup

1. Fill in API keys in `.env`:
   ```
   OPENAI_API_KEY=sk-...
   GITHUB_TOKEN=ghp_...
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   MONGODB_URL=mongodb://host.docker.internal:27017/recruitech
   ```

2. Build the custom image (required — agents need Python deps):
   ```bash
   docker compose build
   docker compose up -d
   ```

The LLM pool (3 slots) and DAG unpause are handled automatically by `scripts/entrypoint.sh` on webserver startup.

### Trigger a Run

```bash
curl -X POST "http://localhost:8080/api/v1/dags/candidate_evaluation/dagRuns" \
  -H "Content-Type: application/json" \
  -u airflow:airflow \
  -d '{
    "conf": {
      "candidate_id": "test_001",
      "job_id": "job_001",
      "job_description": "Senior Python developer with Django, AWS, Docker experience.",
      "resume_s3_url": "s3://your-bucket/resume.pdf",
      "github_url": "https://github.com/torvalds",
      "leetcode_url": ""
    }
  }'
```

### Kafka Trigger

The `kafka-trigger` container runs automatically as part of `kafka/docker-compose.yaml`. It listens to the `candidate-evaluation-request` topic and triggers DAG runs via Airflow REST API. See `kafka/README.md` for details.

## Troubleshooting

- **DAG not showing?** Hard refresh (`Cmd + Shift + R`) or try incognito
- **Scheduler errors?** `docker compose logs airflow-scheduler --tail 30 | grep -i error`
- **Port 8080 in use?** Change in docker-compose.yaml: `"8081:8080"`
- **Import errors in DAG?** Rebuild image: `docker compose build && docker compose up -d`
