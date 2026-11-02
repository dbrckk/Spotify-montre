-- Atelier Montres : durable independent commerce database.
-- No offers or orders are seeded; direct payments remain disabled by default.
BEGIN;
CREATE TABLE IF NOT EXISTS commerce_offers (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{4,64}$'),
  label text NOT NULL CHECK (length(label) BETWEEN 4 AND 180),
  amount_eur_cents integer NOT NULL CHECK (amount_eur_cents BETWEEN 100 AND 1000000),
  unit_cost_eur_cents integer NOT NULL CHECK (unit_cost_eur_cents >= 0),
  reserves_eur_cents integer NOT NULL CHECK (reserves_eur_cents >= 0),
  supplier_max_usd_cents integer NOT NULL CHECK (supplier_max_usd_cents > 0),
  supplier_vid text NOT NULL CHECK (length(supplier_vid) BETWEEN 3 AND 100),
  logistics_name text NOT NULL CHECK (length(logistics_name) BETWEEN 3 AND 100),
  from_country_code char(2) NOT NULL DEFAULT 'CN',
  approved boolean NOT NULL DEFAULT false,
  stock_confirmed boolean NOT NULL DEFAULT false,
  legal_verified boolean NOT NULL DEFAULT false,
  eu_compliance_verified boolean NOT NULL DEFAULT false,
  photo_rights_verified boolean NOT NULL DEFAULT false,
  supplier_payment_verified boolean NOT NULL DEFAULT false,
  verified_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_eur_cents - unit_cost_eur_cents - reserves_eur_cents > 0)
);
CREATE TABLE IF NOT EXISTS commerce_orders (
  id text PRIMARY KEY CHECK (id ~ '^ord_[a-z0-9_-]{12,80}$'),
  public_token_hash text NOT NULL CHECK (length(public_token_hash)=64),
  idempotency_hash text NOT NULL UNIQUE CHECK (length(idempotency_hash)=64),
  request_hash text NOT NULL CHECK (length(request_hash)=64),
  offer_id text NOT NULL REFERENCES commerce_offers(id),
  product_label text NOT NULL,
  amount_eur_cents integer NOT NULL CHECK (amount_eur_cents>0),
  supplier_vid text NOT NULL,
  supplier_max_usd_cents integer NOT NULL CHECK (supplier_max_usd_cents>0),
  logistics_name text NOT NULL,
  from_country_code char(2) NOT NULL,
  address_encrypted text NOT NULL,
  status text NOT NULL CHECK (status IN (
    'PAYMENT_CREATING','PAYMENT_PENDING','PAYMENT_REVIEW','PAYMENT_FAILED',
    'PAID','SUPPLIER_SENDING','SUPPLIER_SUBMITTED','SUPPLIER_PAID',
    'SHIPPED','DELIVERED','EXCEPTION','REFUNDED'
  )),
  payment_id text UNIQUE,
  payment_checkout_url text,
  payment_mode text CHECK (payment_mode IN ('test','live')),
  supplier_order_id text,
  supplier_reserved_usd_cents integer CHECK (supplier_reserved_usd_cents>=0),
  supplier_requested_at timestamptz,
  supplier_received_at timestamptz,
  supplier_status text,
  tracking_number text,
  tracking_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_orders_supplier_queue ON commerce_orders(status,created_at)
  WHERE status IN ('PAID','SUPPLIER_SUBMITTED');
CREATE INDEX IF NOT EXISTS commerce_orders_created ON commerce_orders(created_at);
CREATE TABLE IF NOT EXISTS commerce_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES commerce_orders(id),
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 3 AND 60),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_events_order ON commerce_events(order_id,created_at);
COMMIT;
