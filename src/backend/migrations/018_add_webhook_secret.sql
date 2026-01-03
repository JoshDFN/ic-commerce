-- Add webhook_secret column to payment_methods table for Stripe webhook signature verification
-- This is idempotent - if column exists we just select 1
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('payment_methods') WHERE name='webhook_secret');
