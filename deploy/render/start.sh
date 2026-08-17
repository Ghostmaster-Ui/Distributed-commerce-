#!/bin/sh
set -eu

export NODE_ENV=production
export EVENT_TRANSPORT="${EVENT_TRANSPORT:-local}"
export CATALOG_SERVICE_URL="http://127.0.0.1:8000"
export PRICING_URL="http://127.0.0.1:8001"
export INVENTORY_URL="http://127.0.0.1:8002"
export ORDER_SERVICE_URL="http://127.0.0.1:8003"
export PAYMENT_URL="http://127.0.0.1:8004"

pids=""
start_service() {
  "$@" &
  pids="$pids $!"
}

stop_services() {
  kill $pids 2>/dev/null || true
  wait $pids 2>/dev/null || true
}
trap stop_services INT TERM EXIT

start_service /opt/venv/bin/uvicorn app.main:app --app-dir /app/services/catalog --host 0.0.0.0 --port 8000
start_service /opt/venv/bin/uvicorn app.main:app --app-dir /app/services/pricing --host 0.0.0.0 --port 8001
start_service /opt/venv/bin/uvicorn app.main:app --app-dir /app/services/inventory --host 0.0.0.0 --port 8002
start_service /opt/venv/bin/uvicorn app.main:app --app-dir /app/services/orders --host 0.0.0.0 --port 8003
start_service /opt/venv/bin/uvicorn app.main:app --app-dir /app/services/payments --host 0.0.0.0 --port 8004

cd /app/gateway
start_service node src/index.js
gateway_pid=$!
wait "$gateway_pid"
