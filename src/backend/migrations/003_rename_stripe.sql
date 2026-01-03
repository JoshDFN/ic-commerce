-- Rename the default payment method to Stripe if it is configured as Stripe
UPDATE payment_methods 
SET name = 'Stripe' 
WHERE type = 'stripe' AND (name = 'ICP Payment' OR name = 'Credit Card');
