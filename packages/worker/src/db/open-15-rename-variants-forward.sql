-- OPEN-15 phase 2 — one-off rename of `component_variants.name` on
-- production so step 8 and the admin show the same letter as step 7.
-- Not a migration: run by hand, once, per AGENTS.md §3 and only after the
-- owner has said "обнови имена в базе" (docs/design-audit/open-15-variant-names.md).
--
-- Run:
--   npx wrangler d1 execute brand-constructor-db --env production --remote \
--     --file=./src/db/open-15-rename-variants-forward.sql
--
-- Rollback: open-15-rename-variants-backup-2026-08-27.sql (same command,
-- different --file).
--
-- IMPORTANT — deviation from the plan document found while preparing this
-- script (docs/design-audit/open-15-variant-names.md, phase 2 row): the plan
-- says to order by `variant_number ASC`, "the same formula as
-- buildDisplayVariants". That is not what step 7 actually does. Step 7
-- (packages/constructor/src/views/wizard/VisualComponentsView.vue:223) sorts
-- the fetched variants by their *current* `name` (`localeCompare`) before
-- handing them to buildDisplayVariants — `variant_number` plays no role in
-- what letter a variant gets. Using variant_number ASC as the plan states
-- would have produced a different, wrong mapping for ct_header and
-- ct_tabbar, where variant_number order and name order disagree (e.g.
-- ct_header "Type 4" carries variant_number 6, so a variant_number sort
-- would put it last while a name sort puts it 4th — that part matches here,
-- but ct_header "Type 1" carries variant_number 5, ahead of "Type 2"/"Type 3"
-- at 2/3 — a variant_number sort would reorder them; a name sort does not).
-- This script uses the formula the code actually runs: sort each
-- component_type_id's active variants by current `name`, then assign
-- letters A, B, C… by that position. Read live from production
-- 2026-08-27 (see the backup file for the exact query and snapshot).
--
-- Letters below are already what step 7 shows today (current names already
-- sort as Type 1 < Type 2 < Type 3 < Type 4 within each type, active-only),
-- so this UPDATE looks like a same-shape rename now — it stops being a
-- no-op the next time a variant is added/removed/reordered without a
-- re-run, which is exactly the drift this task is fixing the display for.

UPDATE component_variants SET name = 'Type A' WHERE id = 'cvr_5bb4b69bbab042ab'; -- ct_banners, was Type 1
UPDATE component_variants SET name = 'Type B' WHERE id = 'cvr_fa574a6bb9a54abd'; -- ct_banners, was Type 2
UPDATE component_variants SET name = 'Type C' WHERE id = 'cvr_897cc7d399c84c6c'; -- ct_banners, was Type 3

UPDATE component_variants SET name = 'Type A' WHERE id = 'cvr_7f5b07a9ad854399'; -- ct_header, was Type 1
UPDATE component_variants SET name = 'Type B' WHERE id = 'cvr_36c23bcd42534d90'; -- ct_header, was Type 2
UPDATE component_variants SET name = 'Type C' WHERE id = 'cvr_bcafe1deb4364d82'; -- ct_header, was Type 3
UPDATE component_variants SET name = 'Type D' WHERE id = 'cvr_304ad673ad20466a'; -- ct_header, was Type 4

UPDATE component_variants SET name = 'Type A' WHERE id = 'cvr_1480e16af68d4549'; -- ct_sidebar, was Type 1
UPDATE component_variants SET name = 'Type B' WHERE id = 'cvr_b78014e2c42b42ba'; -- ct_sidebar, was Type 2
UPDATE component_variants SET name = 'Type C' WHERE id = 'cvr_3b35e684ab1e4d2b'; -- ct_sidebar, was Type 3

UPDATE component_variants SET name = 'Type A' WHERE id = 'cvr_989357bfe7ff4891'; -- ct_tabbar, was Type 1
UPDATE component_variants SET name = 'Type B' WHERE id = 'cvr_d95f0f98592e4918'; -- ct_tabbar, was Type 2
UPDATE component_variants SET name = 'Type C' WHERE id = 'cvr_f37383ee201c40e9'; -- ct_tabbar, was Type 3

UPDATE component_variants SET name = 'Type A' WHERE id = 'cvr_956e56de84134edd'; -- ct_thumbnails, was Type 1
UPDATE component_variants SET name = 'Type B' WHERE id = 'cvr_ad9b536f652a4e81'; -- ct_thumbnails, was Type 2
