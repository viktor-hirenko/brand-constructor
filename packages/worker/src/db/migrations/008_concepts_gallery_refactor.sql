-- Migration: Concepts gallery refactor — canonical visual + gallery_url_1..10, drop logo/graphic/previews columns
-- Renumber assets rows for concept_gallery_1..3 via temp types to avoid collisions

ALTER TABLE concepts ADD COLUMN gallery_url_4 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_5 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_6 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_7 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_8 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_9 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_10 TEXT;

UPDATE concepts SET
  gallery_url_7 = preview_url_web,
  gallery_url_6 = preview_url,
  gallery_url_5 = graphic_url_2,
  gallery_url_4 = gallery_url_3,
  gallery_url_3 = gallery_url_2,
  gallery_url_2 = gallery_url_1,
  gallery_url_1 = logo_url;

ALTER TABLE concepts DROP COLUMN logo_url;
ALTER TABLE concepts DROP COLUMN graphic_url_2;
ALTER TABLE concepts DROP COLUMN preview_url;
ALTER TABLE concepts DROP COLUMN preview_url_web;

-- Assets: shift old gallery slots before assigning logo/graphic/previews to new slots
UPDATE assets SET entity_type = 'concept_gallery__tmp3' WHERE entity_type = 'concept_gallery_3';
UPDATE assets SET entity_type = 'concept_gallery__tmp2' WHERE entity_type = 'concept_gallery_2';
UPDATE assets SET entity_type = 'concept_gallery__tmp1' WHERE entity_type = 'concept_gallery_1';

UPDATE assets SET entity_type = 'concept_gallery_1' WHERE entity_type = 'concept_logo';
UPDATE assets SET entity_type = 'concept_gallery_2' WHERE entity_type = 'concept_gallery__tmp1';
UPDATE assets SET entity_type = 'concept_gallery_3' WHERE entity_type = 'concept_gallery__tmp2';
UPDATE assets SET entity_type = 'concept_gallery_4' WHERE entity_type = 'concept_gallery__tmp3';

UPDATE assets SET entity_type = 'concept_gallery_5' WHERE entity_type = 'concept_graphic_2';
UPDATE assets SET entity_type = 'concept_gallery_6' WHERE entity_type = 'concept_preview_mobile';
UPDATE assets SET entity_type = 'concept_gallery_7' WHERE entity_type = 'concept_preview_web';
