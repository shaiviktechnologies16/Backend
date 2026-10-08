#!/bin/bash

set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TTS_DIR="$BACKEND_DIR/local-tts"
TTS_PYTHON="$TTS_DIR/.venv/bin/python"

BACKEND_PID=""
TTS_PID=""

cleanup() {
  echo ""
  echo "Stopping development services..."

  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "$TTS_PID" ]; then
    kill "$TTS_PID" 2>/dev/null || true
  fi

  echo "Development services stopped."
  exit 0
}

trap cleanup INT TERM EXIT

echo "Starting AI SaaS development services..."
echo ""

if [ ! -d "$TTS_DIR" ]; then
  echo "ERROR: TTS project not found:"
  echo "$TTS_DIR"
  exit 1
fi

if [ ! -x "$TTS_PYTHON" ]; then
  echo "ERROR: Python virtual environment not found:"
  echo "$TTS_PYTHON"
  exit 1
fi

if ! "$TTS_PYTHON" -c "import uvicorn" >/dev/null 2>&1; then
  echo "ERROR: Uvicorn is not installed in:"
  echo "$TTS_DIR/.venv"
  exit 1
fi

if lsof -ti :8001 >/dev/null 2>&1; then
  echo "ERROR: Port 8001 is already in use."
  echo "Run: lsof -nP -iTCP:8001 -sTCP:LISTEN"
  exit 1
fi

if lsof -ti :8001 >/dev/null 2>&1; then
  echo "Stopping existing process on port 8001..."
  lsof -ti :8001 | xargs kill 2>/dev/null || true
  sleep 1
fi

echo "Starting IndicF5 TTS server on port 8001..."

cd "$TTS_DIR"

"$TTS_PYTHON" -m uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 8001 &

TTS_PID=$!

export INDICF5_BASE_URLS="${INDICF5_BASE_URLS:-http://127.0.0.1:8001}"
echo "Starting Node.js backend on port 3000..."

npm run dev &

BACKEND_PID=$!

echo ""
echo "======================================"
echo " AI SaaS Development Environment"
echo "======================================"
echo " Backend : http://localhost:3000"
echo " TTS     : http://127.0.0.1:8001"
echo " Ollama  : http://127.0.0.1:11434"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop services."
echo ""

wait