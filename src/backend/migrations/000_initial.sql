-- IC-Commerce Database Schema
-- Based on Solidus e-commerce (BSD-3-Clause License)
-- https://github.com/solidusio/solidus

-- ============================================
-- USERS & AUTH (Internet Identity integration)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    principal       TEXT UNIQUE NOT NULL,
    email           TEXT,
    role            TEXT NOT NULL DEFAULT 'customer', -- admin, customer, guest
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_principal ON users(principal);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- ADDRESSES
-- ============================================
CREATE TABLE IF NOT EXISTS addresses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER,
    firstname       TEXT NOT NULL,
    lastname        TEXT NOT NULL,
    address1        TEXT NOT NULL,
    address2        TEXT,
    city            TEXT NOT NULL,
    state_name      TEXT,
    zipcode         TEXT NOT NULL,
    country_code    TEXT NOT NULL DEFAULT 'US',
    phone           TEXT,
    company         TEXT,
    is_default      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    description         TEXT,
    meta_title          TEXT,
    meta_description    TEXT,
    meta_keywords       TEXT,
    available_on        INTEGER,  -- timestamp when product becomes available
    discontinue_on      INTEGER,  -- timestamp when product is discontinued
    deleted_at          INTEGER,
    promotionable       INTEGER DEFAULT 1,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available_on);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);

-- ============================================
-- VARIANTS (product variations: size, color, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS variants (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    sku             TEXT NOT NULL DEFAULT '',
    weight          REAL DEFAULT 0.0,
    height          REAL,
    width           REAL,
    depth           REAL,
    is_master       INTEGER DEFAULT 0,  -- 1 = master variant
    cost_price      INTEGER,  -- cents
    position        INTEGER DEFAULT 0,
    track_inventory INTEGER DEFAULT 1,
    deleted_at      INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku);

-- ============================================
-- PRICES (multi-currency support)
-- ============================================
CREATE TABLE IF NOT EXISTS prices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id      INTEGER NOT NULL,
    amount          INTEGER NOT NULL,  -- cents
    currency        TEXT NOT NULL DEFAULT 'USD',
    deleted_at      INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES variants(id)
);
CREATE INDEX IF NOT EXISTS idx_prices_variant ON prices(variant_id);

-- ============================================
-- STOCK MANAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS stock_locations (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    name                    TEXT NOT NULL,
    is_default              INTEGER DEFAULT 0,
    address1                TEXT,
    address2                TEXT,
    city                    TEXT,
    state_name              TEXT,
    zipcode                 TEXT,
    country_code            TEXT DEFAULT 'US',
    phone                   TEXT,
    active                  INTEGER DEFAULT 1,
    backorderable_default   INTEGER DEFAULT 0,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_items (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_location_id   INTEGER NOT NULL,
    variant_id          INTEGER NOT NULL,
    count_on_hand       INTEGER NOT NULL DEFAULT 0,
    backorderable       INTEGER DEFAULT 0,
    deleted_at          INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (stock_location_id) REFERENCES stock_locations(id),
    FOREIGN KEY (variant_id) REFERENCES variants(id),
    UNIQUE(stock_location_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_items_variant ON stock_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_location ON stock_items(stock_location_id);

CREATE TABLE IF NOT EXISTS stock_movements (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_item_id       INTEGER NOT NULL,
    quantity            INTEGER NOT NULL DEFAULT 0,
    action              TEXT,  -- sold, received, adjustment
    originator_type     TEXT,
    originator_id       INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
);

-- ============================================
-- OPTION TYPES (Size, Color, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS option_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,  -- internal name
    presentation    TEXT NOT NULL,  -- display name
    position        INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS option_values (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    option_type_id  INTEGER NOT NULL,
    name            TEXT NOT NULL,
    presentation    TEXT NOT NULL,
    position        INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (option_type_id) REFERENCES option_types(id)
);
CREATE INDEX IF NOT EXISTS idx_option_values_type ON option_values(option_type_id);

-- Product option types (which options apply to which products)
CREATE TABLE IF NOT EXISTS product_option_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    option_type_id  INTEGER NOT NULL,
    position        INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (option_type_id) REFERENCES option_types(id)
);

-- Variant option values (which option values a variant has)
CREATE TABLE IF NOT EXISTS option_values_variants (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id      INTEGER NOT NULL,
    option_value_id INTEGER NOT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES variants(id),
    FOREIGN KEY (option_value_id) REFERENCES option_values(id),
    UNIQUE(variant_id, option_value_id)
);

-- ============================================
-- PRODUCT PROPERTIES
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    presentation    TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_properties (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    property_id     INTEGER NOT NULL,
    value           TEXT,
    position        INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
);
CREATE INDEX IF NOT EXISTS idx_product_properties_product ON product_properties(product_id);

-- ============================================
-- TAXONOMIES & TAXONS (Categories)
-- ============================================
CREATE TABLE IF NOT EXISTS taxonomies (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    position        INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS taxons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    taxonomy_id     INTEGER NOT NULL,
    parent_id       INTEGER,
    name            TEXT NOT NULL,
    permalink       TEXT,
    description     TEXT,
    meta_title      TEXT,
    meta_description TEXT,
    meta_keywords   TEXT,
    position        INTEGER DEFAULT 0,
    lft             INTEGER,  -- nested set left
    rgt             INTEGER,  -- nested set right
    depth           INTEGER DEFAULT 0,
    icon_url        TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id),
    FOREIGN KEY (parent_id) REFERENCES taxons(id)
);
CREATE INDEX IF NOT EXISTS idx_taxons_taxonomy ON taxons(taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_taxons_parent ON taxons(parent_id);
CREATE INDEX IF NOT EXISTS idx_taxons_permalink ON taxons(permalink);

CREATE TABLE IF NOT EXISTS products_taxons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    taxon_id        INTEGER NOT NULL,
    position        INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (taxon_id) REFERENCES taxons(id)
);
CREATE INDEX IF NOT EXISTS idx_products_taxons_product ON products_taxons(product_id);
CREATE INDEX IF NOT EXISTS idx_products_taxons_taxon ON products_taxons(taxon_id);

-- ============================================
-- ASSETS (Product Images)
-- ============================================
CREATE TABLE IF NOT EXISTS assets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    viewable_type       TEXT NOT NULL,  -- 'Variant', 'Product'
    viewable_id         INTEGER NOT NULL,
    position            INTEGER DEFAULT 0,
    attachment_url      TEXT NOT NULL,  -- URL to image
    attachment_width    INTEGER,
    attachment_height   INTEGER,
    alt                 TEXT,
    asset_type          TEXT DEFAULT 'Image',  -- Image, Thumbnail, etc.
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_viewable ON assets(viewable_type, viewable_id);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    number                  TEXT UNIQUE NOT NULL,
    user_id                 INTEGER,
    user_principal          TEXT,  -- IC principal for guests
    email                   TEXT,
    state                   TEXT NOT NULL DEFAULT 'cart',  -- cart, address, delivery, payment, confirm, complete, canceled
    item_total              INTEGER NOT NULL DEFAULT 0,  -- cents
    adjustment_total        INTEGER NOT NULL DEFAULT 0,
    total                   INTEGER NOT NULL DEFAULT 0,
    shipment_total          INTEGER NOT NULL DEFAULT 0,
    promo_total             INTEGER NOT NULL DEFAULT 0,
    included_tax_total      INTEGER NOT NULL DEFAULT 0,
    additional_tax_total    INTEGER NOT NULL DEFAULT 0,
    payment_total           INTEGER NOT NULL DEFAULT 0,
    payment_state           TEXT,  -- balance_due, credit_owed, failed, paid, pending, void
    shipment_state          TEXT,  -- backorder, canceled, partial, pending, ready, shipped
    item_count              INTEGER DEFAULT 0,
    bill_address_id         INTEGER,
    ship_address_id         INTEGER,
    currency                TEXT DEFAULT 'USD',
    special_instructions    TEXT,
    completed_at            INTEGER,
    canceled_at             INTEGER,
    canceler_id             INTEGER,
    channel                 TEXT DEFAULT 'web',
    confirmation_delivered  INTEGER DEFAULT 0,
    guest_token             TEXT,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bill_address_id) REFERENCES addresses(id),
    FOREIGN KEY (ship_address_id) REFERENCES addresses(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(number);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_state ON orders(state);
CREATE INDEX IF NOT EXISTS idx_orders_completed ON orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_principal ON orders(user_principal);

-- ============================================
-- LINE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS line_items (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id                INTEGER NOT NULL,
    variant_id              INTEGER NOT NULL,
    quantity                INTEGER NOT NULL DEFAULT 1,
    price                   INTEGER NOT NULL,  -- cents (unit price at time of order)
    currency                TEXT DEFAULT 'USD',
    cost_price              INTEGER,
    adjustment_total        INTEGER DEFAULT 0,
    additional_tax_total    INTEGER DEFAULT 0,
    promo_total             INTEGER DEFAULT 0,
    included_tax_total      INTEGER DEFAULT 0,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (variant_id) REFERENCES variants(id)
);
CREATE INDEX IF NOT EXISTS idx_line_items_order ON line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_line_items_variant ON line_items(variant_id);

-- ============================================
-- ADJUSTMENTS (taxes, promotions, shipping adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS adjustments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type         TEXT,  -- TaxRate, Promotion, Shipment
    source_id           INTEGER,
    adjustable_type     TEXT NOT NULL,  -- Order, LineItem, Shipment
    adjustable_id       INTEGER NOT NULL,
    order_id            INTEGER NOT NULL,
    amount              INTEGER NOT NULL,  -- cents (can be negative)
    label               TEXT,
    included            INTEGER DEFAULT 0,  -- included in price?
    finalized           INTEGER DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE INDEX IF NOT EXISTS idx_adjustments_order ON adjustments(order_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_source ON adjustments(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_adjustable ON adjustments(adjustable_type, adjustable_id);

-- ============================================
-- SHIPMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS shipments (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id                INTEGER NOT NULL,
    number                  TEXT UNIQUE NOT NULL,
    tracking                TEXT,
    cost                    INTEGER DEFAULT 0,
    state                   TEXT DEFAULT 'pending',  -- pending, ready, shipped, canceled
    stock_location_id       INTEGER,
    shipped_at              INTEGER,
    adjustment_total        INTEGER DEFAULT 0,
    additional_tax_total    INTEGER DEFAULT 0,
    promo_total             INTEGER DEFAULT 0,
    included_tax_total      INTEGER DEFAULT 0,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (stock_location_id) REFERENCES stock_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_number ON shipments(number);

-- ============================================
-- SHIPPING METHODS
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_methods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    display_on      TEXT,  -- both, front_end, back_end
    deleted_at      INTEGER,
    tracking_url    TEXT,
    admin_name      TEXT,
    code            TEXT,
    carrier         TEXT,
    service_level   TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_rates (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id         INTEGER NOT NULL,
    shipping_method_id  INTEGER NOT NULL,
    cost                INTEGER DEFAULT 0,
    selected            INTEGER DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id),
    UNIQUE(shipment_id, shipping_method_id)
);

-- ============================================
-- INVENTORY UNITS (individual items in shipments)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_units (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id      INTEGER NOT NULL,
    shipment_id     INTEGER,
    line_item_id    INTEGER,
    state           TEXT DEFAULT 'on_hand',  -- on_hand, backordered, shipped, returned
    pending         INTEGER DEFAULT 1,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES variants(id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (line_item_id) REFERENCES line_items(id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_units_variant ON inventory_units(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_shipment ON inventory_units(shipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_line_item ON inventory_units(line_item_id);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,  -- CreditCard, ICP, StoreCredit
    name            TEXT NOT NULL,
    description     TEXT,
    active          INTEGER DEFAULT 1,
    display_on      TEXT,
    auto_capture    INTEGER DEFAULT 0,
    position        INTEGER DEFAULT 0,
    preferences     TEXT,  -- JSON preferences
    deleted_at      INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL,
    payment_method_id   INTEGER NOT NULL,
    amount              INTEGER NOT NULL,
    state               TEXT DEFAULT 'checkout',  -- checkout, pending, processing, completed, failed, void, invalid
    number              TEXT,
    response_code       TEXT,
    avs_response        TEXT,
    cvv_response_code   TEXT,
    source_type         TEXT,  -- CreditCard, IcpWallet
    source_id           INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_state ON payments(state);

-- ============================================
-- REFUNDS
-- ============================================
CREATE TABLE IF NOT EXISTS refund_reasons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    active          INTEGER DEFAULT 1,
    mutable         INTEGER DEFAULT 1,
    code            TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id          INTEGER NOT NULL,
    amount              INTEGER NOT NULL,
    transaction_id      TEXT,
    refund_reason_id    INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (refund_reason_id) REFERENCES refund_reasons(id)
);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);

-- ============================================
-- RETURN AUTHORIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS return_reasons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    active          INTEGER DEFAULT 1,
    mutable         INTEGER DEFAULT 1,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS return_authorizations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL,
    number              TEXT UNIQUE NOT NULL,
    state               TEXT DEFAULT 'authorized',  -- authorized, canceled
    stock_location_id   INTEGER,
    return_reason_id    INTEGER,
    memo                TEXT,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (stock_location_id) REFERENCES stock_locations(id),
    FOREIGN KEY (return_reason_id) REFERENCES return_reasons(id)
);
CREATE INDEX IF NOT EXISTS idx_return_auth_order ON return_authorizations(order_id);

CREATE TABLE IF NOT EXISTS return_items (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    return_authorization_id INTEGER NOT NULL,
    inventory_unit_id       INTEGER NOT NULL,
    exchange_variant_id     INTEGER,
    amount                  INTEGER NOT NULL DEFAULT 0,
    reception_status        TEXT DEFAULT 'awaiting',  -- awaiting, received, canceled
    acceptance_status       TEXT DEFAULT 'pending',  -- pending, accepted, rejected
    return_reason_id        INTEGER,
    resellable              INTEGER DEFAULT 1,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    FOREIGN KEY (return_authorization_id) REFERENCES return_authorizations(id),
    FOREIGN KEY (inventory_unit_id) REFERENCES inventory_units(id),
    FOREIGN KEY (exchange_variant_id) REFERENCES variants(id),
    FOREIGN KEY (return_reason_id) REFERENCES return_reasons(id)
);
CREATE INDEX IF NOT EXISTS idx_return_items_auth ON return_items(return_authorization_id);

-- ============================================
-- CUSTOMER RETURNS
-- ============================================
CREATE TABLE IF NOT EXISTS customer_returns (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    number              TEXT UNIQUE NOT NULL,
    stock_location_id   INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (stock_location_id) REFERENCES stock_locations(id)
);

-- ============================================
-- STORE CREDITS (wallet)
-- ============================================
CREATE TABLE IF NOT EXISTS store_credit_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS store_credits (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL,
    category_id         INTEGER,
    created_by_id       INTEGER,
    amount              INTEGER NOT NULL DEFAULT 0,
    amount_used         INTEGER NOT NULL DEFAULT 0,
    amount_authorized   INTEGER NOT NULL DEFAULT 0,
    currency            TEXT DEFAULT 'USD',
    memo                TEXT,
    deleted_at          INTEGER,
    invalidated_at      INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES store_credit_categories(id),
    FOREIGN KEY (created_by_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_store_credits_user ON store_credits(user_id);

CREATE TABLE IF NOT EXISTS store_credit_events (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    store_credit_id     INTEGER NOT NULL,
    action              TEXT NOT NULL,  -- capture, authorize, allocation, void, credit
    amount              INTEGER,
    user_total_amount   INTEGER DEFAULT 0,
    authorization_code  TEXT NOT NULL,
    deleted_at          INTEGER,
    originator_type     TEXT,
    originator_id       INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (store_credit_id) REFERENCES store_credits(id)
);
CREATE INDEX IF NOT EXISTS idx_store_credit_events_credit ON store_credit_events(store_credit_id);

-- ============================================
-- PROMOTIONS (basic)
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    code            TEXT,
    starts_at       INTEGER,
    expires_at      INTEGER,
    usage_limit     INTEGER,
    per_code_usage_limit INTEGER,
    advertise       INTEGER DEFAULT 0,
    path            TEXT,
    active          INTEGER DEFAULT 1,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active);

CREATE TABLE IF NOT EXISTS promotion_codes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    promotion_id    INTEGER NOT NULL,
    value           TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id)
);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_value ON promotion_codes(value);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_promotion ON promotion_codes(promotion_id);

-- ============================================
-- TAX CATEGORIES & RATES
-- ============================================
CREATE TABLE IF NOT EXISTS tax_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    is_default      INTEGER DEFAULT 0,
    tax_code        TEXT,
    deleted_at      INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    description         TEXT,
    zone_members_count  INTEGER DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS zone_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id         INTEGER NOT NULL,
    zoneable_type   TEXT NOT NULL,  -- Country, State
    zoneable_id     TEXT NOT NULL,  -- country code or state code
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id)
);
CREATE INDEX IF NOT EXISTS idx_zone_members_zone ON zone_members(zone_id);

CREATE TABLE IF NOT EXISTS tax_rates (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id             INTEGER,
    tax_category_id     INTEGER,
    amount              REAL NOT NULL DEFAULT 0.0,  -- decimal rate (0.08 = 8%)
    name                TEXT,
    show_rate_in_label  INTEGER DEFAULT 1,
    included_in_price   INTEGER DEFAULT 0,
    starts_at           INTEGER,
    expires_at          INTEGER,
    deleted_at          INTEGER,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    FOREIGN KEY (tax_category_id) REFERENCES tax_categories(id)
);
CREATE INDEX IF NOT EXISTS idx_tax_rates_zone ON tax_rates(zone_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_category ON tax_rates(tax_category_id);

-- ============================================
-- SHIPPING CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- ============================================
-- STORES (multi-store support)
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    url                 TEXT,
    code                TEXT UNIQUE,
    mail_from_address   TEXT,
    default_currency    TEXT DEFAULT 'USD',
    meta_description    TEXT,
    meta_keywords       TEXT,
    seo_title           TEXT,
    is_default          INTEGER DEFAULT 0,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stores_code ON stores(code);

-- ============================================
-- PREFERENCES (key-value store for settings)
-- ============================================
CREATE TABLE IF NOT EXISTS preferences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    key             TEXT UNIQUE NOT NULL,
    value           TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_preferences_key ON preferences(key);

-- ============================================
-- STATE CHANGES (audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS state_changes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT,
    previous_state  TEXT,
    next_state      TEXT,
    stateful_type   TEXT NOT NULL,
    stateful_id     INTEGER NOT NULL,
    user_id         INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_state_changes_stateful ON state_changes(stateful_type, stateful_id);

-- ============================================
-- LOG ENTRIES (for debugging/auditing)
-- ============================================
CREATE TABLE IF NOT EXISTS log_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type     TEXT,
    source_id       INTEGER,
    details         TEXT,  -- JSON details
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_entries_source ON log_entries(source_type, source_id);

-- ============================================
-- SEED DATA
-- ============================================

-- Default store
INSERT INTO stores (name, url, code, mail_from_address, is_default, created_at, updated_at)
VALUES ('IC Commerce', 'http://localhost:4943', 'ic-commerce', 'noreply@ic-commerce.app', 1, 0, 0);

-- Default stock location
INSERT INTO stock_locations (name, is_default, address1, city, state_name, zipcode, country_code, active, created_at, updated_at)
VALUES ('Default Warehouse', 1, '123 Commerce St', 'San Francisco', 'CA', '94102', 'US', 1, 0, 0);

-- Default shipping categories
INSERT INTO shipping_categories (name, created_at, updated_at)
VALUES ('Default', 0, 0);

-- Default shipping method
INSERT INTO shipping_methods (name, display_on, code, carrier, service_level, created_at, updated_at)
VALUES
    ('Standard Shipping', 'both', 'standard', 'USPS', 'Ground', 0, 0),
    ('Express Shipping', 'both', 'express', 'FedEx', 'Express', 0, 0);

-- Default payment methods
INSERT INTO payment_methods (type, name, description, active, display_on, position, created_at, updated_at)
VALUES
    ('stripe', 'Credit Card (Stripe)', 'Pay securely with credit or debit card', 1, 'both', 1, 0, 0),
    ('IcpPayment', 'ICP Payment', 'Pay with Internet Computer tokens', 0, 'both', 2, 0, 0),
    ('StoreCredit', 'Store Credit', 'Pay with store credit balance', 0, 'both', 3, 0, 0);

-- Default tax category
INSERT INTO tax_categories (name, description, is_default, created_at, updated_at)
VALUES ('Default', 'Default tax category', 1, 0, 0);

-- Default refund reasons
INSERT INTO refund_reasons (name, active, code, created_at, updated_at)
VALUES
    ('Return', 1, 'return', 0, 0),
    ('Defective', 1, 'defective', 0, 0);

-- Default return reasons
INSERT INTO return_reasons (name, active, created_at, updated_at)
VALUES
    ('Better price available', 1, 0, 0),
    ('Missed estimated delivery date', 1, 0, 0),
    ('Missing parts or accessories', 1, 0, 0),
    ('Damaged/defective', 1, 0, 0),
    ('Different from what was ordered', 1, 0, 0),
    ('No longer needed', 1, 0, 0);

-- Option types (Size, Color)
INSERT INTO option_types (name, presentation, position, created_at, updated_at)
VALUES
    ('size', 'Size', 1, 0, 0),
    ('color', 'Color', 2, 0, 0);

-- Common size options
INSERT INTO option_values (option_type_id, name, presentation, position, created_at, updated_at)
VALUES
    (1, 'xs', 'XS', 1, 0, 0),
    (1, 's', 'S', 2, 0, 0),
    (1, 'm', 'M', 3, 0, 0),
    (1, 'l', 'L', 4, 0, 0),
    (1, 'xl', 'XL', 5, 0, 0),
    (1, 'xxl', 'XXL', 6, 0, 0),
    (1, 'one-size', 'One Size', 7, 0, 0);

-- Common color options
INSERT INTO option_values (option_type_id, name, presentation, position, created_at, updated_at)
VALUES
    (2, 'black', 'Black', 1, 0, 0),
    (2, 'white', 'White', 2, 0, 0),
    (2, 'red', 'Red', 3, 0, 0),
    (2, 'blue', 'Blue', 4, 0, 0),
    (2, 'green', 'Green', 5, 0, 0),
    (2, 'navy', 'Navy', 6, 0, 0),
    (2, 'gray', 'Gray', 7, 0, 0);

-- Default taxonomy (Categories)
INSERT INTO taxonomies (name, position, created_at, updated_at)
VALUES ('Categories', 1, 0, 0);

-- Default taxons (categories)
INSERT INTO taxons (taxonomy_id, parent_id, name, permalink, position, depth, created_at, updated_at)
VALUES
    (1, NULL, 'Categories', 'categories', 0, 0, 0, 0),
    (1, 1, 'Clothing', 'categories/clothing', 1, 1, 0, 0),
    (1, 1, 'Electronics', 'categories/electronics', 2, 1, 0, 0),
    (1, 1, 'Outdoor', 'categories/outdoor', 3, 1, 0, 0),
    (1, 1, 'Home', 'categories/home', 4, 1, 0, 0),
    (1, 2, 'Men', 'categories/clothing/men', 1, 2, 0, 0),
    (1, 2, 'Women', 'categories/clothing/women', 2, 2, 0, 0),
    (1, 4, 'Camping', 'categories/outdoor/camping', 1, 2, 0, 0),
    (1, 4, 'Hiking', 'categories/outdoor/hiking', 2, 2, 0, 0);

-- Sample products
INSERT INTO products (name, slug, description, meta_title, available_on, promotionable, created_at, updated_at)
VALUES
    ('Premium Hiking Backpack', 'premium-hiking-backpack', 'Durable 65L backpack with multiple compartments, hydration sleeve, and rain cover. Perfect for multi-day adventures.', 'Premium Hiking Backpack - IC Commerce', 0, 1, 0, 0),
    ('Ultralight Tent 2P', 'ultralight-tent-2p', 'Two-person tent weighing only 3.5 lbs. Features waterproof coating and aluminum poles.', 'Ultralight Tent 2P - IC Commerce', 0, 1, 0, 0),
    ('Merino Wool Base Layer', 'merino-wool-base-layer', 'Temperature-regulating merino wool shirt. Naturally odor-resistant and moisture-wicking.', 'Merino Wool Base Layer - IC Commerce', 0, 1, 0, 0),
    ('Trail Running Shoes', 'trail-running-shoes', 'Lightweight trail runners with excellent grip and responsive cushioning. Ideal for technical terrain.', 'Trail Running Shoes - IC Commerce', 0, 1, 0, 0),
    ('Insulated Water Bottle', 'insulated-water-bottle', '32oz vacuum-insulated bottle keeps drinks cold 24hr or hot 12hr. BPA-free stainless steel.', 'Insulated Water Bottle - IC Commerce', 0, 1, 0, 0),
    ('Down Puffy Jacket', 'down-puffy-jacket', '800-fill power down jacket. Lightweight and packable warmth for cold conditions.', 'Down Puffy Jacket - IC Commerce', 0, 1, 0, 0);

-- Create master variants for each product
INSERT INTO variants (product_id, sku, is_master, position, created_at, updated_at)
VALUES
    (1, 'HIKE-PACK-001', 1, 0, 0, 0),
    (2, 'TENT-UL-2P', 1, 0, 0, 0),
    (3, 'MERINO-BASE-001', 1, 0, 0, 0),
    (4, 'TRAIL-RUN-001', 1, 0, 0, 0),
    (5, 'BOTTLE-INS-32', 1, 0, 0, 0),
    (6, 'DOWN-PUFFY-001', 1, 0, 0, 0);

-- Prices for master variants (in cents)
INSERT INTO prices (variant_id, amount, currency, created_at, updated_at)
VALUES
    (1, 24900, 'USD', 0, 0),  -- $249.00
    (2, 34900, 'USD', 0, 0),  -- $349.00
    (3, 8900, 'USD', 0, 0),   -- $89.00
    (4, 14900, 'USD', 0, 0),  -- $149.00
    (5, 3900, 'USD', 0, 0),   -- $39.00
    (6, 29900, 'USD', 0, 0);  -- $299.00

-- Stock for master variants
INSERT INTO stock_items (stock_location_id, variant_id, count_on_hand, backorderable, created_at, updated_at)
VALUES
    (1, 1, 50, 0, 0, 0),
    (1, 2, 25, 0, 0, 0),
    (1, 3, 100, 1, 0, 0),
    (1, 4, 75, 0, 0, 0),
    (1, 5, 200, 1, 0, 0),
    (1, 6, 40, 0, 0, 0);

-- Product images
INSERT INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
VALUES
    ('Variant', 1, 0, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 'Hiking Backpack', 'Image', 0, 0),
    ('Variant', 2, 0, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', 'Ultralight Tent', 'Image', 0, 0),
    ('Variant', 3, 0, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800', 'Merino Base Layer', 'Image', 0, 0),
    ('Variant', 4, 0, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'Trail Running Shoes', 'Image', 0, 0),
    ('Variant', 5, 0, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', 'Water Bottle', 'Image', 0, 0),
    ('Variant', 6, 0, 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800', 'Down Jacket', 'Image', 0, 0);

-- Associate products with taxons (categories)
INSERT INTO products_taxons (product_id, taxon_id, position, created_at, updated_at)
VALUES
    (1, 4, 1, 0, 0),  -- Backpack -> Outdoor
    (1, 9, 1, 0, 0),  -- Backpack -> Hiking
    (2, 4, 2, 0, 0),  -- Tent -> Outdoor
    (2, 8, 1, 0, 0),  -- Tent -> Camping
    (3, 2, 1, 0, 0),  -- Base Layer -> Clothing
    (4, 4, 3, 0, 0),  -- Shoes -> Outdoor
    (4, 9, 2, 0, 0),  -- Shoes -> Hiking
    (5, 4, 4, 0, 0),  -- Bottle -> Outdoor
    (6, 2, 2, 0, 0);  -- Jacket -> Clothing

-- Store credit category
INSERT INTO store_credit_categories (name, created_at, updated_at)
VALUES ('Default', 0, 0);
