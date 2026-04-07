# RecruiTech Interview Service

AI interview service: **Express REST**, **Socket.IO + WebRTC** for live interviews, **Kafka** for `interview-complete` events, and **gRPC** for internal machine-to-machine control (same logic as the socket flow for scoring).

## Prerequisites

- Node.js 18+
- MongoDB (same `MONGODB_URL` / DB as the main backend)
- Kafka from repo `kafka/docker-compose.yaml` when you want publish/consume to work

## 1. Install

```bash
cd interview-service
npm install
```

## 2. Environment

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URL` | Shared DB with backend |
| `JWT_SECRET` | Must match backend |
| `OPENAI_API_KEY` | Whisper + interview LLM |
| `KAFKA_BOOTSTRAP_SERVERS` | Host: `localhost:9092`; Docker-only clients on `recruitech-kafka`: `kafka:9094` |
| `INTERVIEW_SERVICE_PORT` | HTTP (default `5000`) |
| `GRPC_ENABLED` | `true` to listen for gRPC (default) |
| `GRPC_PORT` | gRPC port (default `50051`) |
| `GRPC_INTERNAL_SECRET` | Optional; if set, gRPC clients must send the same value in `internal_secret` |
| `FRONTEND_URL` | CORS origin for REST/socket |

## 3. Start Kafka (optional but recommended)

From repo root:

```bash
cd kafka
docker compose up -d
```

## 4. Run the service

### HTTP + WebSocket + gRPC (default)

```bash
npm run dev
```

or:

```bash
npm start
```

You should see:

- `Interview service running on http://localhost:<INTERVIEW_SERVICE_PORT>`
- `WebSocket server ready`
- `REST API at http://localhost:<port>/api/interviews`
- `gRPC InterviewControl listening on 0.0.0.0:<GRPC_PORT>`

### Run HTTP only (disable gRPC)

Set in `.env`:

```env
GRPC_ENABLED=false
```

Then `npm run dev` as above.

## 5. Verify

### REST health

```bash
curl http://localhost:5000/health
```

### gRPC (requires [grpcurl](https://github.com/fullstorydev/grpcurl))

**Create session** (matches backend/recruiter payload shape; add `internal_secret` if `GRPC_INTERNAL_SECRET` is set):

```bash
grpcurl -plaintext -d '{
  "application_id": "APP_ID",
  "candidate_id": "CAND_ID",
  "user_id": "USER_ID",
  "job_id": "JOB_ID",
  "resume_text": "",
  "resume_url": "",
  "job_title": "Engineer",
  "job_description": "Role description"
}' localhost:50051 interview.control.InterviewControl/CreateInterviewSession
```

**Status** (by id or token):

```bash
grpcurl -plaintext -d '{"interview_id": "INTERVIEW_OBJECT_ID"}' \
  localhost:50051 interview.control.InterviewControl/GetInterviewStatus
```

**Submit answer** (must match `current_question_index`; usually `0` until the candidate advances):

```bash
grpcurl -plaintext -d '{
  "interview_id": "INTERVIEW_OBJECT_ID",
  "question_index": 0,
  "answer": "My answer here"
}' localhost:50051 interview.control.InterviewControl/SubmitAnswerForScoring
```

## 6. Backend integration

The main backend **always** creates AI interviews by calling interview-service gRPC (`CreateInterviewSession`). It does not insert new `Interview` documents itself for `sendAiInterview`.

In `backend/.env`:

```env
INTERVIEW_SERVICE_GRPC_ADDRESS=localhost:50051
# GRPC_INTERNAL_SECRET=same-as-interview-service   # if you enable it on interview-service
```

Requirements:

- Interview service running with the same `MONGODB_URL` as backend
- If `GRPC_INTERNAL_SECRET` is set on interview-service, set the same on backend

## Architecture note

- **WebSocket/WebRTC**: real-time candidate session (audio, transcription, `candidate-answer`).
- **gRPC**: internal control/scoring API (`CreateInterviewSession`, `GetInterviewStatus`, `SubmitAnswerForScoring`) using the same answer pipeline as sockets where applicable.
- **REST**: existing `/api/interviews/*` for browsers/HTTP clients.

## 7. Troubleshooting

- **`ENOTFOUND kafka`**: use `localhost:9092` when running this service on the host.
- **gRPC permission errors**: align `GRPC_INTERNAL_SECRET` on client and server, or leave unset on both for local dev only.
- **`question_index must match current_question_index`**: call `GetInterviewStatus` first and use `current_question_index` from the response.
