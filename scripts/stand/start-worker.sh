#!/usr/bin/env bash
# Start the local worker for the stand on 127.0.0.1:8799 with Slack and Jira OFF.
# --env-file makes wrangler skip packages/worker/.dev.vars, which holds the REAL
# Slack bot and Jira tokens. If wrangler still reports .dev.vars, we stop.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
STAND_DIR="${STAND_DIR:-$HERE/.stand}"
mkdir -p "$STAND_DIR"
[ -f "$STAND_DIR/stand.env" ] || cp "$HERE/stand.env.example" "$STAND_DIR/stand.env"
LOG="$STAND_DIR/wrangler.log"
cd "$HERE/../../packages/worker"
npx wrangler dev --env production --local --persist-to "$STAND_DIR/d1" \
  --port 8799 --ip 127.0.0.1 --env-file "$STAND_DIR/stand.env" > "$LOG" 2>&1 &
PID=$!
for _ in $(seq 1 60); do
  if grep -q "Using secrets defined in .dev.vars" "$LOG" 2>/dev/null; then
    kill "$PID"; echo "ABORT: wrangler read .dev.vars (real Slack/Jira tokens)"; exit 1
  fi
  curl -s -m 2 http://127.0.0.1:8799/api/health >/dev/null && break
  sleep 1
done
grep -q "stand.env" "$LOG" || { kill "$PID"; echo "ABORT: stand.env not used"; exit 1; }
echo "stand worker up (pid $PID), log: $LOG"
