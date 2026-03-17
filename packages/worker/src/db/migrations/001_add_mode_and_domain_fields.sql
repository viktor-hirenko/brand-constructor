-- Migration: Add mode to concepts and domain fields to external_namings
-- Date: 2026-03-16
-- Description: Adds mode column to concepts table for Light/Dark theme filtering,
--              and domain, price, availability_status columns to external_namings table.
-- IMPORTANT: These are additive changes - existing data will be preserved.

-- Add mode column to concepts table
ALTER TABLE concepts ADD COLUMN mode TEXT;

-- Add domain-related columns to external_namings table
ALTER TABLE external_namings ADD COLUMN domain TEXT;
ALTER TABLE external_namings ADD COLUMN price REAL;
ALTER TABLE external_namings ADD COLUMN availability_status TEXT DEFAULT 'unknown';

-- Create index for mode filtering (optional, improves query performance)
CREATE INDEX IF NOT EXISTS idx_concepts_mode ON concepts(mode);
