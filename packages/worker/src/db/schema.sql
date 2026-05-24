-- Brand Constructor D1 Schema
-- Version: 1.1 (synced with migrations 003, 007)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'product_designer',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  visual_url TEXT,
  gallery_url_1 TEXT,
  gallery_url_2 TEXT,
  gallery_url_3 TEXT,
  gallery_url_4 TEXT,
  gallery_url_5 TEXT,
  gallery_url_6 TEXT,
  gallery_url_7 TEXT,
  gallery_url_8 TEXT,
  gallery_url_9 TEXT,
  gallery_url_10 TEXT,
  created_by TEXT NOT NULL,
  used_in_brand_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS external_namings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  domain TEXT,
  price REAL,
  availability_status TEXT DEFAULT 'unknown',
  domain_checked_at TEXT,
  domain_check_source TEXT DEFAULT 'manual',
  concept_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  used_in_brand_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS internal_namings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  used_in_brand_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pr_packages (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  teams_involved TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  components_list TEXT NOT NULL DEFAULT '',
  timeline TEXT NOT NULL DEFAULT '',
  expenses TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  used_in_brand_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS component_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS component_variants (
  id TEXT PRIMARY KEY,
  component_type_id TEXT NOT NULL,
  name TEXT NOT NULL,
  variant_number INTEGER NOT NULL,
  thumbnail_url TEXT,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  used_in_brand_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (component_type_id) REFERENCES component_types(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  aspect_ratio REAL NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

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
  development_deadline TEXT,
  deliverables_comment TEXT,
  component_selections TEXT,
  components_comment TEXT,
  delegate_to_designers INTEGER NOT NULL DEFAULT 0,
  new_concept_brief TEXT,
  new_naming_brief TEXT,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
CREATE INDEX IF NOT EXISTS idx_concepts_mode ON concepts(mode);
CREATE INDEX IF NOT EXISTS idx_concepts_created_by ON concepts(created_by);
CREATE INDEX IF NOT EXISTS idx_external_namings_concept_id ON external_namings(concept_id);
CREATE INDEX IF NOT EXISTS idx_external_namings_status ON external_namings(status);
CREATE INDEX IF NOT EXISTS idx_internal_namings_status ON internal_namings(status);
CREATE INDEX IF NOT EXISTS idx_component_variants_type_id ON component_variants(component_type_id);
CREATE INDEX IF NOT EXISTS idx_component_variants_status ON component_variants(status);
CREATE INDEX IF NOT EXISTS idx_assets_entity ON assets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);
CREATE INDEX IF NOT EXISTS idx_brands_created_by ON brands(created_by);
