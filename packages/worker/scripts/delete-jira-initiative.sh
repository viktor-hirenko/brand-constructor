#!/usr/bin/env bash
# Delete a test DHC Initiative via Jira Platform API.
# Credentials: JIRA_API_TOKEN from packages/worker/.dev.vars
# Config: JIRA_CLOUD_ID from packages/worker/wrangler.toml
#
# Usage:
#   ./scripts/delete-jira-initiative.sh DHC-42
#   ./scripts/delete-jira-initiative.sh DHC-42 --yes   # skip confirmation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEV_VARS="$WORKER_DIR/.dev.vars"
WRANGLER_TOML="$WORKER_DIR/wrangler.toml"

ISSUE_KEY="${1:-}"
SKIP_CONFIRM="${2:-}"

if [[ -z "$ISSUE_KEY" ]]; then
  echo "Usage: $0 DHC-XX [--yes]"
  exit 1
fi

if [[ ! "$ISSUE_KEY" =~ ^DHC-[0-9]+$ ]]; then
  echo "Error: expected issue key like DHC-42, got: $ISSUE_KEY"
  exit 1
fi

if [[ ! -f "$DEV_VARS" ]]; then
  echo "Error: .dev.vars not found at $DEV_VARS"
  exit 1
fi

if [[ ! -f "$WRANGLER_TOML" ]]; then
  echo "Error: wrangler.toml not found at $WRANGLER_TOML"
  exit 1
fi

JIRA_API_TOKEN="$(grep -E '^JIRA_API_TOKEN=' "$DEV_VARS" | cut -d= -f2- | tr -d '\r')"
JIRA_CLOUD_ID="$(grep -E '^JIRA_CLOUD_ID\s*=' "$WRANGLER_TOML" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')"

if [[ -z "$JIRA_API_TOKEN" ]]; then
  echo "Error: JIRA_API_TOKEN is empty in .dev.vars"
  exit 1
fi

if [[ -z "$JIRA_CLOUD_ID" ]]; then
  echo "Error: JIRA_CLOUD_ID not found in wrangler.toml"
  exit 1
fi

API_URL="https://api.atlassian.com/ex/jira/${JIRA_CLOUD_ID}/rest/api/3/issue/${ISSUE_KEY}"

if [[ "$SKIP_CONFIRM" != "--yes" ]]; then
  echo "Delete Jira issue: $ISSUE_KEY"
  echo "API: $API_URL"
  read -r -p "Continue? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

HTTP_CODE="$(curl -s -o /tmp/jira-delete-response.txt -w "%{http_code}" -X DELETE "$API_URL" \
  -H "Authorization: Bearer ${JIRA_API_TOKEN}" \
  -H "Accept: application/json")"

if [[ "$HTTP_CODE" == "204" ]]; then
  echo "OK: $ISSUE_KEY deleted (HTTP 204)"
  exit 0
fi

echo "Failed: HTTP $HTTP_CODE"
if [[ -s /tmp/jira-delete-response.txt ]]; then
  cat /tmp/jira-delete-response.txt
  echo
fi
exit 1
