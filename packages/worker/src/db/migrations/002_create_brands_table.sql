-- Migration 002: Create brands table
-- This table stores brand briefs created in the constructor

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  internal_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  geo TEXT,
  launch_date TEXT,
  mode TEXT,
  concept_id TEXT,
  concept_comment TEXT,
  external_naming_ids TEXT,
  external_naming_comment TEXT,
  internal_naming_id TEXT,
  internal_naming_comment TEXT,
  pr_package_id TEXT,
  pr_package_comment TEXT,
  legal_landing INTEGER NOT NULL DEFAULT 0,
  partner_landing INTEGER NOT NULL DEFAULT 0,
  deliverables_comment TEXT,
  component_selections TEXT,
  components_comment TEXT,
  delegate_to_designers INTEGER NOT NULL DEFAULT 0,
  new_concept_brief TEXT,
  ceo_comments TEXT,
  ceo_selections TEXT,
  step_data TEXT,
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE SET NULL,
  FOREIGN KEY (pr_package_id) REFERENCES pr_packages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);
CREATE INDEX IF NOT EXISTS idx_brands_created_by ON brands(created_by);
