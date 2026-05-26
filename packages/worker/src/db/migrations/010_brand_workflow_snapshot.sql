-- Migration 010: workflow snapshot columns on brands (admin list + submit_count).
-- Prod deploy (once, before worker with workflow code): pnpm db:migrate:010:remote
-- Safe on fresh DBs where columns already exist in schema.sql — run only on prod D1 that predates this feature.
ALTER TABLE brands ADD COLUMN submitted_at TEXT;
ALTER TABLE brands ADD COLUMN submitted_by TEXT REFERENCES users(id);
ALTER TABLE brands ADD COLUMN submit_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE brands ADD COLUMN approved_at TEXT;
ALTER TABLE brands ADD COLUMN approved_by TEXT REFERENCES users(id);
ALTER TABLE brands ADD COLUMN needs_revision_at TEXT;
ALTER TABLE brands ADD COLUMN needs_revision_by TEXT REFERENCES users(id);
