-- Add active column to shipping_methods table
ALTER TABLE shipping_methods ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
