#!/usr/bin/env bash
# Load a prod dump into the stand's local D1 copy.
# Usage: scripts/stand/load-db.sh path/to/prod-dump.sql
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
STAND_DIR="${STAND_DIR:-$HERE/.stand}"
DUMP="${1:?usage: load-db.sh <dump.sql>}"
mkdir -p "$STAND_DIR"
cd "$HERE/../../packages/worker"
npx wrangler d1 execute brand-constructor-db --env production --local \
  --persist-to "$STAND_DIR/d1" --file "$DUMP"
