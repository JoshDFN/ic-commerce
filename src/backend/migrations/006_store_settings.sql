-- Store Settings for CMS (Hero text, Features, etc.)
CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Default Settings (Canister Shop Branding)
INSERT OR IGNORE INTO store_settings (key, value, created_at, updated_at) VALUES 
('store_name', 'Canister Shop', strftime('%s', 'now'), strftime('%s', 'now')),
('hero_title', 'SHOP THE\nFUTURE', strftime('%s', 'now'), strftime('%s', 'now')),
('hero_subtitle', 'Premium products. Instant checkout. Powered by blockchain technology that just works.', strftime('%s', 'now'), strftime('%s', 'now')),
('feature_1_title', 'Secure Checkout', strftime('%s', 'now'), strftime('%s', 'now')),
('feature_1_text', 'Your payment data is encrypted and processed securely. We never store your card details.', strftime('%s', 'now'), strftime('%s', 'now')),
('feature_2_title', 'Fast Delivery', strftime('%s', 'now'), strftime('%s', 'now')),
('feature_2_text', 'Orders processed and shipped within 24 hours. Track your package every step of the way.', strftime('%s', 'now'), strftime('%s', 'now')),
('feature_3_title', 'Easy Returns', strftime('%s', 'now'), strftime('%s', 'now')),
('feature_3_text', '30-day hassle-free returns. Not satisfied? Send it back for a full refund, no questions asked.', strftime('%s', 'now'), strftime('%s', 'now'));
