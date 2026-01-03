-- Email Settings for Admin (SendGrid/Mailgun)
CREATE TABLE IF NOT EXISTS email_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT NOT NULL DEFAULT 'sendgrid',
    api_key TEXT NOT NULL DEFAULT '',
    sender_email TEXT NOT NULL DEFAULT 'noreply@example.com',
    active INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Seed default (inactive)
INSERT OR IGNORE INTO email_settings (id, provider, api_key, sender_email, active, created_at, updated_at)
VALUES (1, 'sendgrid', '', 'noreply@canister.shop', 0, strftime('%s', 'now'), strftime('%s', 'now'));
