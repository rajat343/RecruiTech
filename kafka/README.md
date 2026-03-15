# RecruiTech — Kafka

Shared Kafka infrastructure used by Airflow (agents pipeline) and the backend.

## Services

| Service | Port | Description |
|---------|------|-------------|
| kafka | 9092 (external), 9094 (docker internal) | Apache Kafka 3.7.0 (KRaft) |
| kafka-ui | 8081 | Kafka UI dashboard |
| kafka-trigger | — | Consumes `candidate-evaluation-request`, triggers Airflow DAG |

## Setup

```bash
cd kafka
docker compose up -d
```

## Topics

| Topic | Producer | Consumer |
|-------|----------|----------|
| `candidate-evaluation-request` | Backend (when recruiter triggers evaluation) | `kafka-trigger` → Airflow DAG |
| `evaluation-complete` | Airflow DAG (`persist_and_notify` task) | Backend (updates evaluation status) |

## Architecture

```
Backend (Node.js)
  ├── produces → candidate-evaluation-request
  └── consumes ← evaluation-complete

kafka-trigger container
  └── consumes → candidate-evaluation-request
      └── POST /api/v1/dags/candidate_evaluation/dagRuns (Airflow REST API)

Airflow DAG (persist_and_notify task)
  └── produces → evaluation-complete
```

## Networking

All services join the `recruitech-kafka` Docker network. Airflow's docker-compose uses this as an external network, so Airflow containers can reach `kafka:9094` directly.

**Start order:** Kafka first, then Airflow.

```bash
# 1. Kafka
cd kafka && docker compose up -d

# 2. Airflow
cd ../airflow && docker compose up -d
```

## Backend Integration

Your Node.js backend connects to Kafka at `localhost:9092` (the external listener).

**Producer** — when recruiter clicks "Evaluate Candidate":
```js
// Produce to candidate-evaluation-request
{
  candidate_id: "abc123",
  job_id: "job456",
  job_description: "Senior Python developer...",
  resume_s3_url: "s3://bucket/resume.pdf",
  github_url: "https://github.com/username",     // optional
  leetcode_url: "https://leetcode.com/u/username" // optional
}
```

**Consumer** — listen for evaluation results:
```js
// Consume from evaluation-complete
{
  candidate_id: "abc123",
  job_id: "job456",
  final_score: 72.5,
  fit_level: "Moderate",
  dag_run_id: "kafka_abc123_20260315_...",
  summary: "Candidate scored 72.5/100..."
}
```

## Troubleshooting

- **Kafka not starting?** Check Docker has enough resources
- **kafka-trigger can't reach Airflow?** Ensure Airflow is running and `host.docker.internal` resolves
- **Messages not consumed?** Check topic in Kafka UI at http://localhost:8081
