-- Update hero and feature text to new copy
UPDATE store_settings SET value = 'SHOP THE
FUTURE', updated_at = strftime('%s', 'now') WHERE key = 'hero_title';

UPDATE store_settings SET value = 'Premium products. Instant checkout. Powered by blockchain technology that just works.', updated_at = strftime('%s', 'now') WHERE key = 'hero_subtitle';

-- Update feature text
UPDATE store_settings SET value = 'Secure Checkout', updated_at = strftime('%s', 'now') WHERE key = 'feature_1_title';
UPDATE store_settings SET value = 'Your payment data is encrypted and processed securely. We never store your card details.', updated_at = strftime('%s', 'now') WHERE key = 'feature_1_text';

UPDATE store_settings SET value = 'Fast Delivery', updated_at = strftime('%s', 'now') WHERE key = 'feature_2_title';
UPDATE store_settings SET value = 'Orders processed and shipped within 24 hours. Track your package every step of the way.', updated_at = strftime('%s', 'now') WHERE key = 'feature_2_text';

UPDATE store_settings SET value = 'Easy Returns', updated_at = strftime('%s', 'now') WHERE key = 'feature_3_title';
UPDATE store_settings SET value = '30-day hassle-free returns. Not satisfied? Send it back for a full refund, no questions asked.', updated_at = strftime('%s', 'now') WHERE key = 'feature_3_text';
