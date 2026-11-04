-- Atelier Montres : durable independent commerce database.
-- No offers or orders are seeded; direct payments remain disabled by default.
BEGIN;
CREATE TABLE IF NOT EXISTS commerce_offers (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{4,64}$'),
  label text NOT NULL CHECK (length(label) BETWEEN 4 AND 180),
  amount_eur_cents integer NOT NULL CHECK (amount_eur_cents BETWEEN 100 AND 1000000),
  unit_cost_eur_cents integer NOT NULL CHECK (unit_cost_eur_cents >= 0),
  supplier_landed_eur_ceiling_cents integer NOT NULL DEFAULT 0 CHECK (supplier_landed_eur_ceiling_cents >= 0),
  supplier_fx_max_eur_per_usd_bps integer NOT NULL DEFAULT 0 CHECK (supplier_fx_max_eur_per_usd_bps BETWEEN 0 AND 20000),
  vat_rate_bps integer NOT NULL DEFAULT -1 CHECK (vat_rate_bps BETWEEN -1 AND 3000),
  tax_treatment_verified boolean NOT NULL DEFAULT false,
  supplier_fx_verified boolean NOT NULL DEFAULT false,
  return_policy_verified boolean NOT NULL DEFAULT false,
  gpsr_traceability_verified boolean NOT NULL DEFAULT false,
  data_transfer_verified boolean NOT NULL DEFAULT false,
  delivery_min_business_days smallint NOT NULL DEFAULT 0 CHECK (delivery_min_business_days BETWEEN 0 AND 90),
  delivery_max_business_days smallint NOT NULL DEFAULT 0 CHECK (delivery_max_business_days BETWEEN 0 AND 120),
  reserves_eur_cents integer NOT NULL CHECK (reserves_eur_cents >= 0),
  supplier_max_usd_cents integer NOT NULL CHECK (supplier_max_usd_cents > 0),
  supplier_vid text NOT NULL CHECK (length(supplier_vid) BETWEEN 3 AND 100),
  supplier_pid text CHECK (supplier_pid ~ '^[a-zA-Z0-9_-]{3,100}$'),
  supplier_variant_sku text CHECK (supplier_variant_sku ~ '^[a-zA-Z0-9_-]{3,100}$'),
  supplier_product_sku text CHECK (supplier_product_sku ~ '^[a-zA-Z0-9_-]{3,100}$'),
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
-- Upgrade the existing Neon database without dropping any orders or offers.
-- A zero ceiling deliberately blocks approval until an all-in EUR quote is documented.
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  supplier_landed_eur_ceiling_cents integer NOT NULL DEFAULT 0;
-- Old offers have no attested exchange ceiling, so must fail closed.
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  supplier_fx_max_eur_per_usd_bps integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  vat_rate_bps integer NOT NULL DEFAULT -1;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  tax_treatment_verified boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  supplier_fx_verified boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  return_policy_verified boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  gpsr_traceability_verified boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  data_transfer_verified boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  delivery_min_business_days smallint NOT NULL DEFAULT 0;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS
  delivery_max_business_days smallint NOT NULL DEFAULT 0;
-- Legacy offers without verified canonical supplier identity stay unapproved.
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS supplier_pid text;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS supplier_variant_sku text;
ALTER TABLE commerce_offers ADD COLUMN IF NOT EXISTS supplier_product_sku text;

CREATE TABLE IF NOT EXISTS commerce_orders (
  id text PRIMARY KEY CHECK (id ~ '^ord_[a-z0-9_-]{12,80}$'),
  public_token_hash text NOT NULL CHECK (length(public_token_hash)=64),
  idempotency_hash text NOT NULL UNIQUE CHECK (length(idempotency_hash)=64),
  request_hash text NOT NULL CHECK (length(request_hash)=64),
  offer_id text NOT NULL REFERENCES commerce_offers(id),
  product_label text NOT NULL,
  amount_eur_cents integer NOT NULL CHECK (amount_eur_cents>0),
  vat_rate_bps_snapshot integer NOT NULL DEFAULT -1,
  supplier_landed_eur_ceiling_cents integer NOT NULL DEFAULT 0,
  supplier_fx_max_eur_per_usd_bps integer NOT NULL DEFAULT 0,
  promised_delivery_min_business_days smallint NOT NULL DEFAULT 0,
  promised_delivery_max_business_days smallint NOT NULL DEFAULT 0,
  supplier_vid text NOT NULL,
  supplier_pid text CHECK (supplier_pid ~ '^[a-zA-Z0-9_-]{3,100}$'),
  supplier_variant_sku text CHECK (supplier_variant_sku ~ '^[a-zA-Z0-9_-]{3,100}$'),
  supplier_product_sku text CHECK (supplier_product_sku ~ '^[a-zA-Z0-9_-]{3,100}$'),
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
  payment_audited_at timestamptz,
  import_proof_sha256 text CHECK (import_proof_sha256 ~ '^[a-f0-9]{64}
  supplier_reserved_usd_cents integer CHECK (supplier_reserved_usd_cents>=0),
  supplier_requested_at timestamptz,
  supplier_recovery_checked_at timestamptz,
  supplier_recovery_attempts integer NOT NULL DEFAULT 0 CHECK (supplier_recovery_attempts BETWEEN 0 AND 24),
  supplier_received_at timestamptz,
  supplier_checked_at timestamptz,
  supplier_status text,
  tracking_number text,
  tracking_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Contractual price/tax, supplier ceiling and shipping promise are immutable
-- snapshots per order, independent of later offer price updates.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  vat_rate_bps_snapshot integer NOT NULL DEFAULT -1;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_landed_eur_ceiling_cents integer NOT NULL DEFAULT 0;
-- Snapshot the conservative FX limit at checkout, do not use a later offer edit.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_fx_max_eur_per_usd_bps integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  promised_delivery_min_business_days smallint NOT NULL DEFAULT 0;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  promised_delivery_max_business_days smallint NOT NULL DEFAULT 0;
-- Order-level identity snapshots must not change if the offer is edited later.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_pid text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_variant_sku text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_product_sku text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS import_proof_sha256 text;

-- Read-only Mollie reconciliation keeps detecting missed refund/chargeback
-- webhooks even after dispatch. Null means this payment has never been audited.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_audited_at timestamptz;
CREATE INDEX IF NOT EXISTS commerce_orders_payment_audit
  ON commerce_orders(payment_audited_at,created_at)
  WHERE payment_id IS NOT NULL AND status IN (
    'PAYMENT_PENDING','PAID','SUPPLIER_SENDING','SUPPLIER_SUBMITTED',
    'SUPPLIER_PAID','SHIPPED','DELIVERED'
  );

-- Recovery probes never trigger a second supplier purchase.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_recovery_checked_at timestamptz;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_recovery_attempts integer NOT NULL DEFAULT 0;

-- CJ GET order-detail polling has a persistent lease/cadence across workers
-- and service restarts. An unknown check date means never reconciled.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS commerce_orders_supplier_reconciliation
  ON commerce_orders(supplier_checked_at,created_at)
  WHERE supplier_order_id IS NOT NULL
    AND status IN ('SUPPLIER_SUBMITTED','SUPPLIER_PAID','SHIPPED');

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
-- Real provider quote observations are operator-only audit records, never
-- published as product approvals or payment authorizations.
CREATE TABLE IF NOT EXISTS commerce_offer_preflight_quotes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id text NOT NULL REFERENCES commerce_offers(id),
  postal_prefix char(2) NOT NULL CHECK (postal_prefix SIMILAR TO '[0-9][0-9]'),
  product_usd_cents integer NOT NULL CHECK (product_usd_cents>0),
  freight_usd_cents integer NOT NULL CHECK (freight_usd_cents>=0),
  landed_usd_cents integer NOT NULL CHECK (landed_usd_cents>0),
  fx_max_eur_per_usd_bps integer NOT NULL CHECK (fx_max_eur_per_usd_bps BETWEEN 1000 AND 20000),
  upper_landed_eur_cents integer NOT NULL CHECK (upper_landed_eur_cents>0),
  checked_at timestamptz NOT NULL DEFAULT now(),
  CHECK (product_usd_cents + freight_usd_cents = landed_usd_cents)
);
CREATE INDEX IF NOT EXISTS commerce_offer_quotes_by_offer
  ON commerce_offer_preflight_quotes(offer_id,checked_at DESC);

-- An operator-verified, exact-SKU customs/handling/landed-cost record.
-- Recording a document digest cannot establish its truth: the operator is
-- responsible for validating the written supplier/carrier statement.
-- No historic offers are given an implicit customs exemption.
CREATE TABLE IF NOT EXISTS commerce_offer_import_proofs (
  offer_id text PRIMARY KEY REFERENCES commerce_offers(id),
  supplier_vid text NOT NULL,
  supplier_pid text NOT NULL,
  supplier_variant_sku text NOT NULL,
  supplier_product_sku text NOT NULL,
  logistics_name text NOT NULL,
  consignment_value_eur_cents integer NOT NULL
    CHECK (consignment_value_eur_cents BETWEEN 1 AND 15000),
  flat_duty_eur_cents integer NOT NULL CHECK (flat_duty_eur_cents >= 300),
  union_handling_eur_cents integer NOT NULL CHECK (union_handling_eur_cents >= 200),
  buyer_extra_eur_cents integer NOT NULL CHECK (buyer_extra_eur_cents = 0),
  landed_eur_quote_cents integer NOT NULL CHECK (landed_eur_quote_cents >= 500),
  import_payer text NOT NULL CHECK (import_payer IN ('SELLER','SUPPLIER')),
  import_vat_covered boolean NOT NULL CHECK (import_vat_covered = true),
  carrier_clearance_covered boolean NOT NULL CHECK (carrier_clearance_covered = true),
  supplier_evidence_sha256 text NOT NULL
    CHECK (supplier_evidence_sha256 ~ '^[a-f0-9]{64}
),
  valid_until timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (landed_eur_quote_cents >= flat_duty_eur_cents + union_handling_eur_cents)
);
CREATE INDEX IF NOT EXISTS commerce_offer_import_proofs_expiry
  ON commerce_offer_import_proofs(valid_until);
COMMIT;
),
  supplier_order_id text,
  supplier_reserved_usd_cents integer CHECK (supplier_reserved_usd_cents>=0),
  supplier_requested_at timestamptz,
  supplier_recovery_checked_at timestamptz,
  supplier_recovery_attempts integer NOT NULL DEFAULT 0 CHECK (supplier_recovery_attempts BETWEEN 0 AND 24),
  supplier_received_at timestamptz,
  supplier_checked_at timestamptz,
  supplier_status text,
  tracking_number text,
  tracking_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Contractual price/tax, supplier ceiling and shipping promise are immutable
-- snapshots per order, independent of later offer price updates.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  vat_rate_bps_snapshot integer NOT NULL DEFAULT -1;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_landed_eur_ceiling_cents integer NOT NULL DEFAULT 0;
-- Snapshot the conservative FX limit at checkout, do not use a later offer edit.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_fx_max_eur_per_usd_bps integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  promised_delivery_min_business_days smallint NOT NULL DEFAULT 0;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  promised_delivery_max_business_days smallint NOT NULL DEFAULT 0;
-- Order-level identity snapshots must not change if the offer is edited later.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_pid text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_variant_sku text;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_product_sku text;

-- Read-only Mollie reconciliation keeps detecting missed refund/chargeback
-- webhooks even after dispatch. Null means this payment has never been audited.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_audited_at timestamptz;
CREATE INDEX IF NOT EXISTS commerce_orders_payment_audit
  ON commerce_orders(payment_audited_at,created_at)
  WHERE payment_id IS NOT NULL AND status IN (
    'PAYMENT_PENDING','PAID','SUPPLIER_SENDING','SUPPLIER_SUBMITTED',
    'SUPPLIER_PAID','SHIPPED','DELIVERED'
  );

-- Recovery probes never trigger a second supplier purchase.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_recovery_checked_at timestamptz;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS
  supplier_recovery_attempts integer NOT NULL DEFAULT 0;

-- CJ GET order-detail polling has a persistent lease/cadence across workers
-- and service restarts. An unknown check date means never reconciled.
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS supplier_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS commerce_orders_supplier_reconciliation
  ON commerce_orders(supplier_checked_at,created_at)
  WHERE supplier_order_id IS NOT NULL
    AND status IN ('SUPPLIER_SUBMITTED','SUPPLIER_PAID','SHIPPED');

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
-- Real provider quote observations are operator-only audit records, never
-- published as product approvals or payment authorizations.
CREATE TABLE IF NOT EXISTS commerce_offer_preflight_quotes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id text NOT NULL REFERENCES commerce_offers(id),
  postal_prefix char(2) NOT NULL CHECK (postal_prefix SIMILAR TO '[0-9][0-9]'),
  product_usd_cents integer NOT NULL CHECK (product_usd_cents>0),
  freight_usd_cents integer NOT NULL CHECK (freight_usd_cents>=0),
  landed_usd_cents integer NOT NULL CHECK (landed_usd_cents>0),
  fx_max_eur_per_usd_bps integer NOT NULL CHECK (fx_max_eur_per_usd_bps BETWEEN 1000 AND 20000),
  upper_landed_eur_cents integer NOT NULL CHECK (upper_landed_eur_cents>0),
  checked_at timestamptz NOT NULL DEFAULT now(),
  CHECK (product_usd_cents + freight_usd_cents = landed_usd_cents)
);
CREATE INDEX IF NOT EXISTS commerce_offer_quotes_by_offer
  ON commerce_offer_preflight_quotes(offer_id,checked_at DESC);

-- An operator-verified, exact-SKU customs/handling/landed-cost record.
-- Recording a document digest cannot establish its truth: the operator is
-- responsible for validating the written supplier/carrier statement.
-- No historic offers are given an implicit customs exemption.
CREATE TABLE IF NOT EXISTS commerce_offer_import_proofs (
  offer_id text PRIMARY KEY REFERENCES commerce_offers(id),
  supplier_vid text NOT NULL,
  supplier_pid text NOT NULL,
  supplier_variant_sku text NOT NULL,
  supplier_product_sku text NOT NULL,
  logistics_name text NOT NULL,
  consignment_value_eur_cents integer NOT NULL
    CHECK (consignment_value_eur_cents BETWEEN 1 AND 15000),
  flat_duty_eur_cents integer NOT NULL CHECK (flat_duty_eur_cents >= 300),
  union_handling_eur_cents integer NOT NULL CHECK (union_handling_eur_cents >= 200),
  buyer_extra_eur_cents integer NOT NULL CHECK (buyer_extra_eur_cents = 0),
  landed_eur_quote_cents integer NOT NULL CHECK (landed_eur_quote_cents >= 500),
  import_payer text NOT NULL CHECK (import_payer IN ('SELLER','SUPPLIER')),
  import_vat_covered boolean NOT NULL CHECK (import_vat_covered = true),
  carrier_clearance_covered boolean NOT NULL CHECK (carrier_clearance_covered = true),
  supplier_evidence_sha256 text NOT NULL
    CHECK (supplier_evidence_sha256 ~ '^[a-f0-9]{64}
),
  valid_until timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (landed_eur_quote_cents >= flat_duty_eur_cents + union_handling_eur_cents)
);
CREATE INDEX IF NOT EXISTS commerce_offer_import_proofs_expiry
  ON commerce_offer_import_proofs(valid_until);
COMMIT;
