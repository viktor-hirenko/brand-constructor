-- Migration: track who uploaded each asset
ALTER TABLE assets ADD COLUMN uploaded_by TEXT REFERENCES users(id);
