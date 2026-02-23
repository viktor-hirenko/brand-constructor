-- Seed data for development

-- Default admin user (dev mode fallback)
INSERT OR IGNORE INTO users (id, email, name, role) VALUES
  ('usr_admin_001', 'admin@brand-constructor.dev', 'Admin', 'admin');

-- Default component types (MVP)
INSERT OR IGNORE INTO component_types (id, name, description, sort_order) VALUES
  ('ct_banners', 'Banners', 'Promotional banners displayed on the main page', 1),
  ('ct_tabbar', 'Tabbar', 'Bottom navigation tab bar', 2),
  ('ct_header', 'Header', 'Top header with logo and navigation', 3),
  ('ct_thumbnails', 'Thumbnails', 'Game and category thumbnail cards', 4),
  ('ct_sidebar', 'Sidebar', 'Side navigation panel', 5),
  ('ct_theme', 'Theme', 'Light or dark color theme', 6);
