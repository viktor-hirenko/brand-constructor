-- Migration 007: Add domain check tracking fields to external_namings
-- Supports automatic domain availability checking via GoDaddy API

ALTER TABLE external_namings ADD COLUMN domain_checked_at TEXT;
ALTER TABLE external_namings ADD COLUMN domain_check_source TEXT DEFAULT 'manual';
