#!/usr/bin/env bash
set -euo pipefail

npm run format:check
npm run lint
npm run build
(cd gateway && npm test)
uvx --from ruff==0.12.11 ruff format --check services
uvx --from ruff==0.12.11 ruff check services
python3 -m compileall -q services
docker compose config --quiet

echo "All quality checks passed."
