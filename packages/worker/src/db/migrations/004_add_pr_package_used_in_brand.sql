-- Migration: Add used_in_brand_id to pr_packages
-- Allows tracking which brand approved with this PR package

ALTER TABLE pr_packages ADD COLUMN used_in_brand_id TEXT;
