-- Migration: Add extra image fields to concepts
-- Adds graphic_url_2 (second graphic element) and gallery_url_1..3 (gallery images)

ALTER TABLE concepts ADD COLUMN graphic_url_2 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_1 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_2 TEXT;
ALTER TABLE concepts ADD COLUMN gallery_url_3 TEXT;
