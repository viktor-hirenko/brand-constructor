-- Migration 013: brief status `in_work` (brief-orders plan, phase 1).
--
-- Columns only. Moving the briefs that are «in work» today (`submitted` with an
-- order) is a separate, generated file: the set of ids is computed in JS by the
-- same `brandHasNewBriefsFromRow` the worker uses — SQLite TRIM is not JS trim,
-- and a broken `step_data` must not abort the run. Generator:
--   pnpm --filter @brand-constructor/worker migrate:013:data <brands.json> <namings.json> <out-dir>
-- Order on prod: Worker → Pages → this file → the generated data file.
-- Down: 013_down.sql.
ALTER TABLE brands ADD COLUMN sent_to_work_at TEXT;
ALTER TABLE brands ADD COLUMN orders_ready_at TEXT;
ALTER TABLE brands ADD COLUMN orders_ready_by TEXT REFERENCES users(id);
ALTER TABLE brands ADD COLUMN orders_slack_channel TEXT;
ALTER TABLE brands ADD COLUMN orders_slack_ts TEXT;
