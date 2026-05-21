-- Migration: Add preview_url_web to concepts
-- Separates mobile preview (preview_url) and web preview (preview_url_web)

ALTER TABLE concepts ADD COLUMN preview_url_web TEXT;
