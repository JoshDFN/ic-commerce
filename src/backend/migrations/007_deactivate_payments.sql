-- Deactivate default payment methods so they don't appear active without keys
UPDATE payment_methods SET active = 0 WHERE name IN ('Credit Card (Stripe)', 'Store Credit');
