#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
DB_SERVICE="db"
DB_USER="expenseuser"
DB_NAME="expensedb"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
USE_DOCKER_DB=1
DB_HOST="localhost"
DB_PORT="5432"

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
else
  echo "Docker Compose is required to start the database."
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd npm

if [ -f "$BACKEND_ENV_FILE" ]; then
  # Load backend env so the launcher follows the same database target as the app.
  # shellcheck disable=SC1090
  source "$BACKEND_ENV_FILE"
fi

if [ -n "${DATABASE_URL:-}" ]; then
  if [[ "$DATABASE_URL" =~ @([^:/]+):([0-9]+) ]]; then
    DB_HOST="${BASH_REMATCH[1]}"
    DB_PORT="${BASH_REMATCH[2]}"
  fi
fi

ensure_dependencies() {
  local service_dir="$1"
  if [ ! -d "$service_dir/node_modules" ]; then
    echo "Installing dependencies in $service_dir"
    (cd "$service_dir" && npm install)
  fi
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi

  wait >/dev/null 2>&1 || true

  if [ "${STARTED_DOCKER_DB:-0}" = "1" ]; then
    echo
    echo "Stopping database container"
    "${COMPOSE_CMD[@]}" stop "$DB_SERVICE" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

if command -v pg_isready >/dev/null 2>&1 && pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
  USE_DOCKER_DB=0
fi

if [ "$USE_DOCKER_DB" = "1" ]; then
  echo "Starting PostgreSQL with ${COMPOSE_CMD[*]}"
  "${COMPOSE_CMD[@]}" up -d "$DB_SERVICE"
  STARTED_DOCKER_DB=1

  echo "Waiting for PostgreSQL to accept connections"
  until "${COMPOSE_CMD[@]}" exec -T "$DB_SERVICE" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
    sleep 1
  done
else
  echo "Using existing PostgreSQL at $DB_HOST:$DB_PORT"
fi

ensure_dependencies "$BACKEND_DIR"
ensure_dependencies "$FRONTEND_DIR"

echo "Running database migration"
(cd "$BACKEND_DIR" && npm run migrate)

echo "Starting backend on http://localhost:4000"
(cd "$BACKEND_DIR" && npm run dev) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:3000"
(cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0) &
FRONTEND_PID=$!

echo
echo "App is starting:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo "Press Ctrl+C to stop frontend, backend, and database."

wait "$BACKEND_PID" "$FRONTEND_PID"
