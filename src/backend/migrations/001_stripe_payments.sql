-- Stripe Payment Integration
-- Adds Stripe-specific columns to existing tables and creates new Stripe tables

-- ============================================
-- ADD STRIPE COLUMNS TO EXISTING payment_methods TABLE
-- ============================================
-- The payment_methods table already exists from 000_initial.sql
-- We add Stripe-specific columns
ALTER TABLE payment_methods ADD COLUMN api_key TEXT;
ALTER TABLE payment_methods ADD COLUMN publishable_key TEXT;
ALTER TABLE payment_methods ADD COLUMN webhook_secret TEXT;
ALTER TABLE payment_methods ADD COLUMN test_mode INTEGER DEFAULT 1;
ALTER TABLE payment_methods ADD COLUMN available_to_users INTEGER DEFAULT 1;
ALTER TABLE payment_methods ADD COLUMN available_to_admin INTEGER DEFAULT 1;

-- ============================================
-- PAYMENT SOURCES (stored cards, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_sources (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_method_id           INTEGER NOT NULL,
    user_id                     INTEGER,
    stripe_payment_method_id    TEXT,
    stripe_customer_id          TEXT,
    card_brand                  TEXT,
    card_last4                  TEXT,
    card_exp_month              INTEGER,
    card_exp_year               INTEGER,
    created_at                  INTEGER NOT NULL,
    updated_at                  INTEGER NOT NULL,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payment_sources_user ON payment_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sources_stripe ON payment_sources(stripe_payment_method_id);

-- ============================================
-- PAYMENT INTENTS (Stripe Payment Intents)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_intents (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id                INTEGER NOT NULL,
    payment_method_id       INTEGER NOT NULL,
    stripe_intent_id        TEXT,
    client_secret           TEXT,
    amount                  INTEGER NOT NULL,
    currency                TEXT NOT NULL DEFAULT 'USD',
    status                  TEXT DEFAULT 'requires_payment_method',
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe ON payment_intents(stripe_intent_id);

-- ============================================
-- ADD STRIPE COLUMNS TO EXISTING payments TABLE
-- ============================================
ALTER TABLE payments ADD COLUMN payment_source_id INTEGER;
ALTER TABLE payments ADD COLUMN stripe_payment_intent_id TEXT;

-- ============================================
-- STRIPE WEBHOOK EVENTS (for idempotency)
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id         TEXT UNIQUE NOT NULL,
    event_type              TEXT NOT NULL,
    processed               INTEGER DEFAULT 0,
    created_at              INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_id ON stripe_webhook_events(stripe_event_id);

-- ============================================
-- STORE SETTINGS (for global config)
-- ============================================
CREATE TABLE IF NOT EXISTS store_settings (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    key                     TEXT UNIQUE NOT NULL,
    value                   TEXT,
    encrypted               INTEGER DEFAULT 0,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL
);

-- ============================================
-- UPDATE DEFAULT PAYMENT METHOD FOR STRIPE
-- ============================================
UPDATE payment_methods SET
    type = 'stripe',
    test_mode = 1,
    available_to_users = 1,
    available_to_admin = 1
WHERE type = 'CreditCard' OR name = 'Credit Card';
