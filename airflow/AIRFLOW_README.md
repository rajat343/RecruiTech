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

- **Airflow UI**: http://localhost:8080 (airflow / airflow)
- **Kafka UI**: http://localhost:8081

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

3. Create the LLM pool (limits concurrent agent calls):
   ```bash
   docker compose exec airflow-webserver airflow pools set llm_pool 3 "LLM rate limit pool"
   ```

4. Unpause the DAG:
   ```bash
   docker compose exec airflow-webserver airflow dags unpause candidate_evaluation
   ```

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

### Kafka Trigger (optional)

Run the standalone consumer to auto-trigger DAGs from Kafka:

```bash
cd scripts
pip install kafka-python-ng requests
python kafka_trigger.py
```

## Troubleshooting

- **DAG not showing?** Hard refresh (`Cmd + Shift + R`) or try incognito
- **Scheduler errors?** `docker compose logs airflow-scheduler --tail 30 | grep -i error`
- **Port 8080 in use?** Change in docker-compose.yaml: `"8081:8080"`
- **Import errors in DAG?** Rebuild image: `docker compose build && docker compose up -d`
