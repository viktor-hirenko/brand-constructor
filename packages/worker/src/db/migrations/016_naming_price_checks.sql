-- Migration 016: nightly check of the purchase price of «For sale» domains
-- (docs/architecture/domain-price-sync-plan.md).
--
-- A marketplace's reading is kept apart from `purchase_price`, the price a
-- person entered: one row per naming and marketplace, the last attempt and
-- the last answer that was actually read.

CREATE TABLE IF NOT EXISTS naming_price_checks (
  naming_id TEXT NOT NULL,
  source TEXT NOT NULL,
  -- listed | no_fixed_price | absent | unread — of the last attempt.
  outcome TEXT NOT NULL,
  -- The rest is from the last answer that was read; an unread attempt keeps it.
  amount REAL,
  currency TEXT,
  min_offer REAL,
  url TEXT,
  attempted_at TEXT NOT NULL,
  read_at TEXT,
  -- A new price of the marketplace that leads the row, waiting to be read
  -- again on another date before it is written.
  pending_amount REAL,
  pending_date TEXT,
  PRIMARY KEY (naming_id, source),
  FOREIGN KEY (naming_id) REFERENCES external_namings(id) ON DELETE CASCADE
);

-- The marketplace the price was last matched to, and the price it had then:
-- the row is led by it only while `purchase_price` still equals `price_synced`.
ALTER TABLE external_namings ADD COLUMN price_source TEXT;
ALTER TABLE external_namings ADD COLUMN price_synced REAL;
-- The price before the last automatic update, and when that was.
ALTER TABLE external_namings ADD COLUMN price_prev REAL;
ALTER TABLE external_namings ADD COLUMN price_updated_at TEXT;
-- Checks in a row, on different dates, where no marketplace had the listing.
ALTER TABLE external_namings ADD COLUMN price_absent_nights INTEGER NOT NULL DEFAULT 0;
ALTER TABLE external_namings ADD COLUMN price_absent_date TEXT;
-- When «For sale» was taken off automatically.
ALTER TABLE external_namings ADD COLUMN price_delisted_at TEXT;
-- The marketplace price a person chose not to take.
ALTER TABLE external_namings ADD COLUMN price_dismissed_source TEXT;
ALTER TABLE external_namings ADD COLUMN price_dismissed_amount REAL;
