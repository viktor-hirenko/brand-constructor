-- Migration 015: the price a domain for sale costs to buy from its owner
-- (docs/architecture/domain-status-plan.md). Entered by the team, in USD; read
-- only when availability_status = 'for_sale'. `price` stays the registrar's
-- registration price and is kept only for an available domain.
-- Numbered 015: 013 and 014 belong to the orders version (feature/brief-orders).

ALTER TABLE external_namings ADD COLUMN purchase_price REAL;
