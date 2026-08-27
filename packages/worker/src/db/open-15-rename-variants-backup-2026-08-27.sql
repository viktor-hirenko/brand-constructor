-- OPEN-15 phase 2 — snapshot of `component_variants.name` on production,
-- taken 2026-08-27 via:
--   npx wrangler d1 execute brand-constructor-db --env production --remote \
--     --command "SELECT id, component_type_id, name, variant_number, status
--                 FROM component_variants ORDER BY component_type_id, name;"
--
-- Purpose: rollback source for open-15-rename-variants-forward.sql. Run this
-- file to put every variant's `name` back to what it was before the forward
-- script ran. Not a migration — one-off, run by hand per AGENTS.md §3.
--
-- One row of state per variant, exactly as read from prod (no variant_number
-- drift is used here — see open-15-rename-variants-forward.sql header for why):

UPDATE component_variants SET name = 'Type 1' WHERE id = 'cvr_5bb4b69bbab042ab'; -- ct_banners
UPDATE component_variants SET name = 'Type 2' WHERE id = 'cvr_fa574a6bb9a54abd'; -- ct_banners
UPDATE component_variants SET name = 'Type 3' WHERE id = 'cvr_897cc7d399c84c6c'; -- ct_banners

UPDATE component_variants SET name = 'Type 1' WHERE id = 'cvr_7f5b07a9ad854399'; -- ct_header
UPDATE component_variants SET name = 'Type 2' WHERE id = 'cvr_36c23bcd42534d90'; -- ct_header
UPDATE component_variants SET name = 'Type 3' WHERE id = 'cvr_bcafe1deb4364d82'; -- ct_header
UPDATE component_variants SET name = 'Type 4' WHERE id = 'cvr_304ad673ad20466a'; -- ct_header

UPDATE component_variants SET name = 'Type 1' WHERE id = 'cvr_1480e16af68d4549'; -- ct_sidebar
UPDATE component_variants SET name = 'Type 2' WHERE id = 'cvr_b78014e2c42b42ba'; -- ct_sidebar
UPDATE component_variants SET name = 'Type 3' WHERE id = 'cvr_3b35e684ab1e4d2b'; -- ct_sidebar

UPDATE component_variants SET name = 'Type 1' WHERE id = 'cvr_989357bfe7ff4891'; -- ct_tabbar
UPDATE component_variants SET name = 'Type 2' WHERE id = 'cvr_d95f0f98592e4918'; -- ct_tabbar
UPDATE component_variants SET name = 'Type 3' WHERE id = 'cvr_f37383ee201c40e9'; -- ct_tabbar

UPDATE component_variants SET name = 'Type 1' WHERE id = 'cvr_956e56de84134edd'; -- ct_thumbnails
UPDATE component_variants SET name = 'Type 2' WHERE id = 'cvr_ad9b536f652a4e81'; -- ct_thumbnails
