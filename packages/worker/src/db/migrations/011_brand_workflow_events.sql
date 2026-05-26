-- Migration 011: append-only workflow event log.
-- Prod deploy (after 010): pnpm db:migrate:011:remote
-- Required for GET /api/brands/:id/workflow-events and status/CEO event inserts.
CREATE TABLE IF NOT EXISTS brand_workflow_events (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  meta TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_brand_workflow_events_brand
  ON brand_workflow_events(brand_id, created_at DESC);
