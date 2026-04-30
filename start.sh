#!/bin/bash
# ==============================================================================
# RecruiTech — Full Stack Startup Script
# Starts all services sequentially with env validation and health checks.
#
# Usage:  ./start.sh           (start all services)
#         ./start.sh --check   (only validate env files, don't start)
#         ./start.sh --stop    (stop all services)
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; }
header()  { echo -e "\n${BOLD}═══ $1 ═══${NC}"; }

# ── PID tracking for cleanup ──────────────────────────────────────────────────
PIDS=()
SERVICES=()

cleanup() {
  echo ""
  header "Shutting down services"
  for i in "${!PIDS[@]}"; do
    if kill -0 "${PIDS[$i]}" 2>/dev/null; then
      kill "${PIDS[$i]}" 2>/dev/null && info "Stopped ${SERVICES[$i]} (PID ${PIDS[$i]})"
    fi
  done

  # Stop Docker services
  if docker compose -f "$ROOT_DIR/kafka/docker-compose.yaml" ps -q 2>/dev/null | grep -q .; then
    info "Stopping Kafka containers..."
    docker compose -f "$ROOT_DIR/kafka/docker-compose.yaml" down 2>/dev/null
  fi
  if docker compose -f "$ROOT_DIR/airflow/docker-compose.yaml" ps -q 2>/dev/null | grep -q .; then
    info "Stopping Airflow containers..."
    docker compose -f "$ROOT_DIR/airflow/docker-compose.yaml" down 2>/dev/null
  fi

  success "All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Stop mode ─────────────────────────────────────────────────────────────────
if [ "$1" = "--stop" ]; then
  header "Stopping all RecruiTech services"

  # Kill Node services on known ports
  for port in 4000 5001 5173; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      kill $pid 2>/dev/null && info "Killed process on port $port (PID $pid)"
    fi
  done

  # Stop Docker services
  info "Stopping Kafka containers..."
  docker compose -f "$ROOT_DIR/kafka/docker-compose.yaml" down 2>/dev/null || true
  info "Stopping Airflow containers..."
  docker compose -f "$ROOT_DIR/airflow/docker-compose.yaml" down 2>/dev/null || true

  success "All services stopped."
  exit 0
fi

# ==============================================================================
# ENV VALIDATION
# ==============================================================================
header "Validating environment files"

ERRORS=0

# ── Helper: check .env exists and required keys are set ───────────────────────
check_env() {
  local service="$1"
  local env_file="$2"
  shift 2
  local required_keys=("$@")

  if [ ! -f "$env_file" ]; then
    fail "$service: missing $env_file"
    ERRORS=$((ERRORS + 1))
    return 1
  fi

  local missing=()
  for key in "${required_keys[@]}"; do
    # Check key exists and has a non-empty value (not a placeholder)
    val=$(grep -E "^${key}=" "$env_file" 2>/dev/null | head -1 | cut -d'=' -f2-)
    if [ -z "$val" ]; then
      missing+=("$key")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    fail "$service: missing or empty vars in $env_file:"
    for m in "${missing[@]}"; do
      echo -e "        ${RED}→ $m${NC}"
    done
    ERRORS=$((ERRORS + 1))
    return 1
  fi

  success "$service: all required env vars present"
  return 0
}

# ── Backend ───────────────────────────────────────────────────────────────────
check_env "Backend" "$ROOT_DIR/backend/.env" \
  PORT JWT_SECRET MONGODB_URL KAFKA_BOOTSTRAP_SERVERS

# ── Frontend ──────────────────────────────────────────────────────────────────
check_env "Frontend" "$ROOT_DIR/frontend/.env" \
  VITE_API_URL VITE_GRAPHQL_URL

# ── Interview Service ─────────────────────────────────────────────────────────
check_env "Interview Service" "$ROOT_DIR/interview-service/.env" \
  INTERVIEW_SERVICE_PORT MONGODB_URL JWT_SECRET OPENAI_API_KEY KAFKA_BOOTSTRAP_SERVERS

# ── Airflow ───────────────────────────────────────────────────────────────────
check_env "Airflow" "$ROOT_DIR/airflow/.env" \
  AIRFLOW_UID OPENAI_API_KEY KAFKA_BOOTSTRAP_SERVERS MONGODB_URL GMAIL_USER GMAIL_APP_PASSWORD

# ── Check Docker is running ───────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  fail "Docker is not running. Kafka and Airflow require Docker."
  ERRORS=$((ERRORS + 1))
fi

# ── Check MongoDB is reachable ────────────────────────────────────────────────
if command -v mongosh &>/dev/null; then
  if mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    success "MongoDB: reachable"
  else
    fail "MongoDB: not reachable at localhost:27017"
    ERRORS=$((ERRORS + 1))
  fi
elif command -v mongod &>/dev/null; then
  if pgrep -x mongod >/dev/null 2>&1; then
    success "MongoDB: process running"
  else
    fail "MongoDB: mongod is not running"
    ERRORS=$((ERRORS + 1))
  fi
else
  warn "MongoDB: cannot verify (mongosh/mongod not found in PATH)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [ $ERRORS -gt 0 ]; then
  echo ""
  fail "Found $ERRORS issue(s). Fix them before starting."
  exit 1
fi

success "All checks passed!"

if [ "$1" = "--check" ]; then
  exit 0
fi

# ==============================================================================
# STARTUP
# ==============================================================================

# ── Helper: wait for a TCP port ───────────────────────────────────────────────
wait_for_port() {
  local name="$1"
  local port="$2"
  local timeout="${3:-30}"
  local elapsed=0

  while ! nc -z localhost "$port" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $elapsed -ge $timeout ]; then
      fail "$name did not become ready on port $port within ${timeout}s"
      return 1
    fi
  done
  success "$name is ready on port $port (${elapsed}s)"
}

# ── Helper: wait for HTTP health endpoint ─────────────────────────────────────
wait_for_health() {
  local name="$1"
  local url="$2"
  local timeout="${3:-60}"
  local elapsed=0

  while ! curl -sf "$url" >/dev/null 2>&1; do
    sleep 2
    elapsed=$((elapsed + 2))
    if [ $elapsed -ge $timeout ]; then
      fail "$name health check failed at $url within ${timeout}s"
      return 1
    fi
  done
  success "$name health check passed (${elapsed}s)"
}

# ── 1. Kafka (Docker) ────────────────────────────────────────────────────────
header "Starting Kafka"
info "Running docker compose up -d ..."
docker compose -f "$ROOT_DIR/kafka/docker-compose.yaml" up -d --build 2>&1 | while read -r line; do echo "        $line"; done
wait_for_port "Kafka broker" 9092 60

# ── 2. Backend ────────────────────────────────────────────────────────────────
header "Starting Backend"
cd "$ROOT_DIR/backend"
npm run dev > "$ROOT_DIR/logs/backend.log" 2>&1 &
backend_pid=$!
PIDS+=($backend_pid)
SERVICES+=("Backend")
info "Backend starting (PID $backend_pid, log: logs/backend.log)"
wait_for_port "Backend" 4000 30

# ── 3. Interview Service ─────────────────────────────────────────────────────
header "Starting Interview Service"
cd "$ROOT_DIR/interview-service"
npm run dev > "$ROOT_DIR/logs/interview-service.log" 2>&1 &
interview_pid=$!
PIDS+=($interview_pid)
SERVICES+=("Interview Service")
info "Interview Service starting (PID $interview_pid, log: logs/interview-service.log)"
wait_for_port "Interview Service" 5001 30

# ── 4. Frontend ───────────────────────────────────────────────────────────────
header "Starting Frontend"
cd "$ROOT_DIR/frontend"
npm run dev > "$ROOT_DIR/logs/frontend.log" 2>&1 &
frontend_pid=$!
PIDS+=($frontend_pid)
SERVICES+=("Frontend")
info "Frontend starting (PID $frontend_pid, log: logs/frontend.log)"
wait_for_port "Frontend" 5173 30

# ── 5. Airflow (Docker) ──────────────────────────────────────────────────────
header "Starting Airflow"
info "Running docker compose up -d ..."
docker compose -f "$ROOT_DIR/airflow/docker-compose.yaml" up -d 2>&1 | while read -r line; do echo "        $line"; done
info "Waiting for Airflow webserver (this may take a minute)..."
wait_for_health "Airflow" "http://localhost:8080/health" 120

# ==============================================================================
# SUMMARY
# ==============================================================================
header "All services are running!"
echo ""
echo -e "  ${BOLD}Service              URL${NC}"
echo -e "  ─────────────────────────────────────────────────"
echo -e "  Frontend             ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend (GraphQL)    ${CYAN}http://localhost:4000/graphql${NC}"
echo -e "  Interview Service    ${CYAN}http://localhost:5001${NC}"
echo -e "  Kafka UI             ${CYAN}http://localhost:8081${NC}"
echo -e "  Airflow UI           ${CYAN}http://localhost:8080${NC}  (airflow / airflow)"
echo ""
echo -e "  ${YELLOW}Logs:${NC} $ROOT_DIR/logs/"
echo -e "  ${YELLOW}Stop:${NC} ./start.sh --stop  or  Ctrl+C"
echo ""

# Keep script alive so Ctrl+C triggers cleanup
wait
