-- Migration 014: a library item made for a brief's order (brief-orders plan, phase 2a).
--
-- `for_brand_id` is the brief the Strategy team made the concept / naming for.
-- While it is set the item is reserved for that brief: other briefs neither see
-- it in the wizard nor may pick it (enforced by the worker). It is cleared when
-- the order is cancelled, the brief deleted, or — for what the brief did not
-- pick — on approval.
-- Order on prod: this file → Worker → Pages. The old code ignores the column,
-- so going back is Pages → Worker without touching the database.
ALTER TABLE concepts ADD COLUMN for_brand_id TEXT REFERENCES brands(id);
ALTER TABLE external_namings ADD COLUMN for_brand_id TEXT REFERENCES brands(id);
ALTER TABLE internal_namings ADD COLUMN for_brand_id TEXT REFERENCES brands(id);
CREATE INDEX IF NOT EXISTS idx_concepts_for_brand ON concepts(for_brand_id);
CREATE INDEX IF NOT EXISTS idx_external_namings_for_brand ON external_namings(for_brand_id);
CREATE INDEX IF NOT EXISTS idx_internal_namings_for_brand ON internal_namings(for_brand_id);
