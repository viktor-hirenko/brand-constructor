-- Component library for local development: the rows wizard step 7 needs.
--
-- `seed.sql` creates the six component types but no variants, so step 7 has
-- nothing to offer locally. These 14 variants and the 14 thumbnails they point
-- at are the production library as of 2026-03-18, copied out of a production
-- dump. Only library rows are here — no users, brands, concepts or namings,
-- so the file carries no personal data and is safe to keep in git.
--
-- Run after `db:seed` (it owns `usr_admin_001`, referenced by `created_by`):
--   pnpm --filter @brand-constructor/worker db:seed
--   pnpm --filter @brand-constructor/worker db:seed:components
--
-- The images themselves live in the production R2 bucket, not locally. The dev
-- servers reach them through the `/api/assets/*` fallback — see
-- `packages/shared/src/dev/assetFallback.mjs`.
--
-- Re-runnable: INSERT OR REPLACE, so running it again restores the rows to
-- this snapshot instead of failing on primary keys.

INSERT OR IGNORE INTO component_types (id, name, description, sort_order) VALUES
  ('ct_banners', 'Banners', 'Promotional banners displayed on the main page', 1),
  ('ct_tabbar', 'Tabbar', 'Bottom navigation tab bar', 2),
  ('ct_header', 'Header', 'Top header with logo and navigation', 3),
  ('ct_thumbnails', 'Thumbnails', 'Game and category thumbnail cards', 4),
  ('ct_sidebar', 'Sidebar', 'Side navigation panel', 5),
  ('ct_theme', 'Theme', 'Light or dark color theme', 6);

-- `preview_url` is NULL on every production row: the renderer falls back to
-- `thumbnail_url`. Dedicated slice previews arrive with UXUI-2554 phase 3.
INSERT OR REPLACE INTO component_variants
  (id, component_type_id, name, variant_number, thumbnail_url, preview_url, status, created_by, used_in_brand_id, created_at, updated_at) VALUES
  ('cvr_897cc7d399c84c6c','ct_banners','Type 3',3,'/api/assets/component_thumbnail/cvr_897cc7d399c84c6c/ast_2314cdac40db4e9b.png',NULL,'active','usr_admin_001',NULL,'2026-02-24 18:53:14','2026-02-24 18:53:20'),
  ('cvr_36c23bcd42534d90','ct_header','Type 2',2,'/api/assets/component_thumbnail/cvr_36c23bcd42534d90/ast_8fea9c9ce417431f.png',NULL,'active','usr_admin_001',NULL,'2026-02-24 18:54:45','2026-03-18 17:47:51'),
  ('cvr_bcafe1deb4364d82','ct_header','Type 3',3,'/api/assets/component_thumbnail/cvr_bcafe1deb4364d82/ast_35ae76e757614f4f.png',NULL,'active','usr_admin_001',NULL,'2026-02-24 18:55:00','2026-02-24 18:55:06'),
  ('cvr_b78014e2c42b42ba','ct_sidebar','Type 2',2,'/api/assets/component_thumbnail/cvr_b78014e2c42b42ba/ast_22e959772a974199.png',NULL,'active','usr_admin_001',NULL,'2026-02-24 18:57:32','2026-03-18 17:47:51'),
  ('cvr_fa574a6bb9a54abd','ct_banners','Type 2',4,'/api/assets/component_thumbnail/cvr_fa574a6bb9a54abd/ast_6ddf6cc6ac114b7e.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:14:47','2026-03-18 17:47:51'),
  ('cvr_ad9b536f652a4e81','ct_thumbnails','Type 2',3,'/api/assets/component_thumbnail/cvr_ad9b536f652a4e81/ast_d3e0935b080a4140.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:16:23','2026-03-18 17:47:51'),
  ('cvr_f37383ee201c40e9','ct_tabbar','Type 3',4,'/api/assets/component_thumbnail/cvr_f37383ee201c40e9/ast_f4c3457ee01b4a14.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:17:32','2026-03-18 09:17:47'),
  ('cvr_3b35e684ab1e4d2b','ct_sidebar','Type 3',4,'/api/assets/component_thumbnail/cvr_3b35e684ab1e4d2b/ast_e29da26597b64b98.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:18:23','2026-03-18 09:18:44'),
  ('cvr_7f5b07a9ad854399','ct_header','Type 1',5,'/api/assets/component_thumbnail/cvr_7f5b07a9ad854399/ast_28029c0aa438425c.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:29:13','2026-03-24 13:16:40'),
  ('cvr_5bb4b69bbab042ab','ct_banners','Type 1',5,'/api/assets/component_thumbnail/cvr_5bb4b69bbab042ab/ast_03d59d9d73404105.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:29:45','2026-03-24 13:16:40'),
  ('cvr_989357bfe7ff4891','ct_tabbar','Type 1',5,'/api/assets/component_thumbnail/cvr_989357bfe7ff4891/ast_871ac7c082c84a29.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:30:21','2026-03-24 13:16:40'),
  ('cvr_956e56de84134edd','ct_thumbnails','Type 1',4,'/api/assets/component_thumbnail/cvr_956e56de84134edd/ast_690bbc2159b9477c.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:30:50','2026-03-24 13:16:40'),
  ('cvr_1480e16af68d4549','ct_sidebar','Type 1',5,'/api/assets/component_thumbnail/cvr_1480e16af68d4549/ast_8f530b72d43c4f2f.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 09:31:32','2026-03-24 13:16:40'),
  ('cvr_d95f0f98592e4918','ct_tabbar','Type 2',6,'/api/assets/component_thumbnail/cvr_d95f0f98592e4918/ast_9338647466d54779.png',NULL,'active','usr_admin_001',NULL,'2026-03-18 14:08:10','2026-03-18 17:47:51');

-- Asset rows for the thumbnails above. The wizard reads URLs off the variant,
-- but the admin library lists and deletes through `assets`, so without these
-- the two screens disagree about the same picture.
INSERT OR REPLACE INTO assets
  (id, entity_type, entity_id, file_url, file_name, file_type, aspect_ratio, width, height, file_size, created_at) VALUES
  ('ast_2314cdac40db4e9b','component_thumbnail','cvr_897cc7d399c84c6c','/api/assets/component_thumbnail/cvr_897cc7d399c84c6c/ast_2314cdac40db4e9b.png','banner_3.png','png',1.9322916666666667,371,192,86842,'2026-02-24 18:53:20'),
  ('ast_8fea9c9ce417431f','component_thumbnail','cvr_36c23bcd42534d90','/api/assets/component_thumbnail/cvr_36c23bcd42534d90/ast_8fea9c9ce417431f.png','header_2.png','png',5.625,360,64,12117,'2026-02-24 18:54:54'),
  ('ast_35ae76e757614f4f','component_thumbnail','cvr_bcafe1deb4364d82','/api/assets/component_thumbnail/cvr_bcafe1deb4364d82/ast_35ae76e757614f4f.png','header_3.png','png',5.625,360,64,6330,'2026-02-24 18:55:06'),
  ('ast_22e959772a974199','component_thumbnail','cvr_b78014e2c42b42ba','/api/assets/component_thumbnail/cvr_b78014e2c42b42ba/ast_22e959772a974199.png','sidebar_2.png','png',0.43956043956043955,360,819,47147,'2026-02-24 18:57:37'),
  ('ast_6ddf6cc6ac114b7e','component_thumbnail','cvr_fa574a6bb9a54abd','/api/assets/component_thumbnail/cvr_fa574a6bb9a54abd/ast_6ddf6cc6ac114b7e.png','banner_2.png','png',1.9322916666666667,371,192,94355,'2026-03-18 09:15:20'),
  ('ast_d3e0935b080a4140','component_thumbnail','cvr_ad9b536f652a4e81','/api/assets/component_thumbnail/cvr_ad9b536f652a4e81/ast_d3e0935b080a4140.png','thumbnails_2.png','png',1.855,371,200,180613,'2026-03-18 09:16:50'),
  ('ast_f4c3457ee01b4a14','component_thumbnail','cvr_f37383ee201c40e9','/api/assets/component_thumbnail/cvr_f37383ee201c40e9/ast_f4c3457ee01b4a14.png','tab_bar_3.png','png',4.526315789473684,344,76,7155,'2026-03-18 09:17:47'),
  ('ast_e29da26597b64b98','component_thumbnail','cvr_3b35e684ab1e4d2b','/api/assets/component_thumbnail/cvr_3b35e684ab1e4d2b/ast_e29da26597b64b98.png','sidebar_3.png','png',0.44078144078144077,361,819,62271,'2026-03-18 09:18:44'),
  ('ast_28029c0aa438425c','component_thumbnail','cvr_7f5b07a9ad854399','/api/assets/component_thumbnail/cvr_7f5b07a9ad854399/ast_28029c0aa438425c.png','header_1.png','png',6.046875,387,64,4319,'2026-03-18 09:29:25'),
  ('ast_03d59d9d73404105','component_thumbnail','cvr_5bb4b69bbab042ab','/api/assets/component_thumbnail/cvr_5bb4b69bbab042ab/ast_03d59d9d73404105.png','banner_1.png','png',1.9322916666666667,371,192,103896,'2026-03-18 09:29:57'),
  ('ast_871ac7c082c84a29','component_thumbnail','cvr_989357bfe7ff4891','/api/assets/component_thumbnail/cvr_989357bfe7ff4891/ast_871ac7c082c84a29.png','tab_bar_1.png','png',5.065789473684211,385,76,13775,'2026-03-18 09:30:30'),
  ('ast_690bbc2159b9477c','component_thumbnail','cvr_956e56de84134edd','/api/assets/component_thumbnail/cvr_956e56de84134edd/ast_690bbc2159b9477c.png','thumbnails_1.png','png',2.2083333333333335,371,168,146013,'2026-03-18 09:31:01'),
  ('ast_8f530b72d43c4f2f','component_thumbnail','cvr_1480e16af68d4549','/api/assets/component_thumbnail/cvr_1480e16af68d4549/ast_8f530b72d43c4f2f.png','sidebar_1.png','png',0.3907203907203907,320,819,40504,'2026-03-18 09:31:46'),
  ('ast_9338647466d54779','component_thumbnail','cvr_d95f0f98592e4918','/api/assets/component_thumbnail/cvr_d95f0f98592e4918/ast_9338647466d54779.png','tab_bar_2.png','png',4.315789473684211,328,76,4032,'2026-03-18 14:08:32');
