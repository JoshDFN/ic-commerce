-- Add base_cost column to shipping_methods table
ALTER TABLE shipping_methods ADD COLUMN base_cost INTEGER NOT NULL DEFAULT 799;

-- Update existing shipping methods with appropriate costs
UPDATE shipping_methods SET base_cost = 1500 WHERE code = 'express';
UPDATE shipping_methods SET base_cost = 799 WHERE code = 'standard' OR code IS NULL;
