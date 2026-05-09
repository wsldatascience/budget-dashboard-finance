#!/usr/bin/env bash
# Full pipeline runner — executes all stages in order.
# Usage:
#   ./scripts/run_pipeline.sh
#   EMPRESA_FILTER="OUTRA EMPRESA" ./scripts/run_pipeline.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${PYTHON:-python}"

echo "=== [1/6] Running main pipeline (staging → mart → quality) ==="
$PYTHON -m src.main

echo ""
echo "=== [2/6] Generating dashboard JSON ==="
$PYTHON src/generate_dashboard_data.py

echo ""
echo "=== [3/6] Generating ML data ==="
$PYTHON src/generate_ml_data.py

echo ""
echo "=== [4/6] Generating AI narrative ==="
if $PYTHON src/generate_narrative.py; then
    echo "     narrative.json updated"
else
    echo "     [SKIP] narrative generation failed — check ANTHROPIC_API_KEY"
fi

echo ""
echo "=== [5/6] Running validation gate ==="
$PYTHON src/quality/validation_gate.py || echo "     AVISO: validation gate reportou falhas"

echo ""
echo "=== [6/6] Building dashboard ==="
cd dashboard && npm run build
cd ..

echo ""
echo "=== Pipeline complete. Start dashboard with: python scripts/server.py ==="
