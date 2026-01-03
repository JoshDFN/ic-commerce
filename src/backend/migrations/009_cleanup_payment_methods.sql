-- Clean up duplicate payment methods
-- Delete the old "Credit Card (Stripe)" that has type IcpPayment
DELETE FROM payment_methods WHERE name = 'Credit Card (Stripe)' AND type = 'IcpPayment';

-- Also delete any ICP Payment method that was auto-renamed
DELETE FROM payment_methods WHERE type = 'IcpPayment' AND name LIKE '%Stripe%';

-- Ensure the stripe method is properly configured
UPDATE payment_methods SET
    name = 'Credit Card',
    description = 'Pay securely with credit or debit card'
WHERE type = 'stripe';
