#!/usr/bin/env bash
# Starts the FastAPI backend and the Vite dev server together.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() { kill 0 2>/dev/null || true; }
trap cleanup EXIT

echo "Starting backend on http://127.0.0.1:8000 ..."
(cd "$ROOT/backend" && uvicorn app.main:app --reload --port 8000) &

sleep 5

echo "Starting frontend on http://localhost:5173 ..."
(cd "$ROOT/frontend" && npm run dev) &

wait
