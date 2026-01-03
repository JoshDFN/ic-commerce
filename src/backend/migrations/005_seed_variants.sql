-- Rename ICP Payment to Credit Card (Stripe)
UPDATE payment_methods 
SET name = 'Credit Card (Stripe)', 
    description = 'Secure credit card payment via Stripe',
    available_to_users = 1,
    active = 1
WHERE name = 'ICP Payment';

-- Seed Variants for Product 6 (Down Puffy Jacket)

-- Small
INSERT INTO variants (product_id, sku, is_master, position, created_at, updated_at)
VALUES (6, 'DOWN-PUFFY-S', 0, 1, strftime('%s', 'now'), strftime('%s', 'now'));

INSERT INTO option_values_variants (variant_id, option_value_id, created_at, updated_at)
SELECT last_insert_rowid(), 2, strftime('%s', 'now'), strftime('%s', 'now'); -- 2 is 'S'

INSERT INTO prices (variant_id, amount, currency, created_at, updated_at)
SELECT seq, 29900, 'USD', strftime('%s', 'now'), strftime('%s', 'now') FROM sqlite_sequence WHERE name = 'variants';

INSERT INTO stock_items (stock_location_id, variant_id, count_on_hand, backorderable, created_at, updated_at)
SELECT 1, seq, 10, 1, strftime('%s', 'now'), strftime('%s', 'now') FROM sqlite_sequence WHERE name = 'variants';

-- Medium
INSERT INTO variants (product_id, sku, is_master, position, created_at, updated_at)
VALUES (6, 'DOWN-PUFFY-M', 0, 2, strftime('%s', 'now'), strftime('%s', 'now'));

INSERT INTO option_values_variants (variant_id, option_value_id, created_at, updated_at)
SELECT last_insert_rowid(), 3, strftime('%s', 'now'), strftime('%s', 'now'); -- 3 is 'M'

INSERT INTO prices (variant_id, amount, currency, created_at, updated_at)
SELECT seq, 29900, 'USD', strftime('%s', 'now'), strftime('%s', 'now') FROM sqlite_sequence WHERE name = 'variants';

INSERT INTO stock_items (stock_location_id, variant_id, count_on_hand, backorderable, created_at, updated_at)
SELECT 1, seq, 15, 1, strftime('%s', 'now'), strftime('%s', 'now') FROM sqlite_sequence WHERE name = 'variants';

-- Large
INSERT INTO variants (product_id, sku, is_master, position, created_at, updated_at)
VALUES (6, 'DOWN-PUFFY-L', 0, 3, strftime('%s', 'now'), strftime('%s', 'now'));

INSERT INTO option_values_variants (variant_id, option_value_id, created_at, updated_at)
SELECT last_insert_rowid(), 4, strftime('%s', 'now'), strftime('%s', 'now'); -- 4 is 'L'

INSERT INTO prices (variant_id, amount, currency, created_at, updated_at)
SELECT seq, 29900, 'USD', strftime('%s', 'now'), strftime('%s', 'now') FROM sqlite_sequence WHERE name = 'variants';

INSERT INTO stock_items (stock_location_id, variant_id, count_on_hand, backorderable, created_at, updated_at)
SELECT 1, seq, 5, 0, strftime('%s', 'now'), strftime('%s', 'now') FROM sqlite_sequence WHERE name = 'variants';
