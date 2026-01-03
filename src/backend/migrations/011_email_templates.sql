-- Email Templates System
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT UNIQUE NOT NULL,  -- order_confirmation, order_shipped, order_delivered, order_canceled
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Default email templates with HTML
INSERT OR IGNORE INTO email_templates (event_type, name, subject, body_html, body_text, active, created_at, updated_at) VALUES
('order_confirmation', 'Order Confirmation', 'Order Confirmed - {{order_number}}',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
    .content { padding: 30px; background: #f9f9f9; }
    .order-box { background: #fff; border: 1px solid #eee; padding: 20px; margin: 20px 0; }
    .order-number { font-size: 24px; font-weight: bold; color: #000; }
    .items { margin: 20px 0; }
    .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 20px; font-weight: bold; text-align: right; padding-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{store_name}}</h1>
    </div>
    <div class="content">
      <h2>Thank you for your order!</h2>
      <p>Hi {{customer_name}},</p>
      <p>We have received your order and are getting it ready. We will notify you when it ships.</p>

      <div class="order-box">
        <div class="order-number">Order {{order_number}}</div>
        <div class="items">
          {{#items}}
          <div class="item">
            <span>{{quantity}}x {{name}}</span>
            <span>{{price}}</span>
          </div>
          {{/items}}
        </div>
        <div class="total">Total: {{total}}</div>
      </div>

      <p>Shipping to:<br>{{shipping_address}}</p>
    </div>
    <div class="footer">
      <p>Questions? Reply to this email or contact us.</p>
      <p>&copy; {{store_name}}</p>
    </div>
  </div>
</body>
</html>',
'Thank you for your order!

Hi {{customer_name}},

We have received your order and are getting it ready.

Order: {{order_number}}
{{items_text}}

Total: {{total}}

Shipping to:
{{shipping_address}}

Questions? Reply to this email.

- {{store_name}}',
1, strftime('%s', 'now'), strftime('%s', 'now')),

('order_shipped', 'Order Shipped', 'Your Order Has Shipped - {{order_number}}',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
    .content { padding: 30px; background: #f9f9f9; }
    .tracking-box { background: #fff; border: 1px solid #eee; padding: 20px; margin: 20px 0; text-align: center; }
    .tracking-number { font-size: 20px; font-weight: bold; color: #000; font-family: monospace; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{store_name}}</h1>
    </div>
    <div class="content">
      <h2>Your order is on its way!</h2>
      <p>Hi {{customer_name}},</p>
      <p>Great news! Your order {{order_number}} has shipped and is on its way to you.</p>

      <div class="tracking-box">
        <p>Tracking Number:</p>
        <div class="tracking-number">{{tracking_number}}</div>
        <a href="{{tracking_url}}" class="btn">Track Package</a>
      </div>

      <p>Shipping to:<br>{{shipping_address}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{store_name}}</p>
    </div>
  </div>
</body>
</html>',
'Your order is on its way!

Hi {{customer_name}},

Great news! Your order {{order_number}} has shipped.

Tracking Number: {{tracking_number}}
Track your package: {{tracking_url}}

Shipping to:
{{shipping_address}}

- {{store_name}}',
1, strftime('%s', 'now'), strftime('%s', 'now')),

('order_canceled', 'Order Canceled', 'Order Canceled - {{order_number}}',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{store_name}}</h1>
    </div>
    <div class="content">
      <h2>Order Canceled</h2>
      <p>Hi {{customer_name}},</p>
      <p>Your order {{order_number}} has been canceled. If you were charged, a refund will be processed within 5-7 business days.</p>
      <p>If you have any questions, please reply to this email.</p>
    </div>
    <div class="footer">
      <p>&copy; {{store_name}}</p>
    </div>
  </div>
</body>
</html>',
'Order Canceled

Hi {{customer_name}},

Your order {{order_number}} has been canceled. If you were charged, a refund will be processed within 5-7 business days.

If you have any questions, please reply to this email.

- {{store_name}}',
1, strftime('%s', 'now'), strftime('%s', 'now'));
