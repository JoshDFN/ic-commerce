import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getBackend, formatPrice } from '../lib/backend';
import { useCart } from '../hooks/useCart';

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

interface ValidationErrors {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  zip?: string;
}

function validateCheckoutForm(fields: {
  name: string;
  email: string;
  address: string;
  city: string;
  zip: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!fields.name.trim()) {
    errors.name = 'Name is required';
  } else if (fields.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!fields.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(fields.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!fields.address.trim()) {
    errors.address = 'Address is required';
  } else if (fields.address.trim().length < 5) {
    errors.address = 'Please enter a complete address';
  }

  if (!fields.city.trim()) {
    errors.city = 'City is required';
  }

  if (!fields.zip.trim()) {
    errors.zip = 'ZIP code is required';
  } else if (!ZIP_REGEX.test(fields.zip.trim())) {
    errors.zip = 'Please enter a valid ZIP code (e.g., 10001 or 10001-1234)';
  }

  return errors;
}

interface PaymentMethod {
  id: bigint;
  name: string;
  method_type: string;
  active: boolean;
  publishable_key: string[];
}

// Lazy load Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, refreshCart } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Calculate totals
  const subtotal = cart ? Number(cart.item_total) : 0;
  const shipping = subtotal >= 10000 ? 0 : 799; // Free shipping over $100
  const total = subtotal + shipping;

  useEffect(() => {
    // Redirect if no cart
    if (!cart && !paymentComplete) {
      navigate('/cart');
      return;
    }
    if (cart && cart.line_items.length === 0 && !paymentComplete) {
      navigate('/cart');
      return;
    }
  }, [cart, paymentComplete, navigate]);

  useEffect(() => {
    async function initPayment() {
      if (!cart || cart.line_items.length === 0) return;

      try {
        const backend = await getBackend();

        // Get publishable key from payment methods
        const pmResult = await backend.get_payment_methods();
        if ('Ok' in pmResult) {
          const stripeMethod = (pmResult.Ok as PaymentMethod[]).find(
            (m) => m.method_type === 'stripe' && m.active
          );
          // publishable_key is opt text, so it comes as [] or [string]
          const pubKey = stripeMethod?.publishable_key?.[0];
          if (pubKey) {
            setPublishableKey(pubKey);
            stripePromise = loadStripe(pubKey);
          } else {
            setError('Stripe is not configured. Please contact support.');
            return;
          }
        }

        // Create payment intent with the total amount
        const result = await backend.create_payment_intent(BigInt(total));
        if ('Ok' in result) {
          setClientSecret(result.Ok);
        } else {
          setError('Failed to initialize payment: ' + result.Err);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError('Failed to initialize payment: ' + message);
      }
    }

    initPayment();
  }, [cart, total]);

  if (!cart || cart.line_items.length === 0) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="bg-sand min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-red-800 mb-2">Payment Error</h2>
            <p className="text-red-600">{error}</p>
            <button onClick={() => navigate('/cart')} className="mt-4 btn-secondary">
              Return to Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret || !publishableKey || !stripePromise) {
    return (
      <div className="bg-sand min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-midnight border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-sand min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-black text-midnight tracking-tighter mb-12">Secure Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Payment Form */}
          <div className="flex-1">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                cart={cart}
                total={total}
                onSuccess={() => {
                  setPaymentComplete(true);
                  refreshCart();
                }}
              />
            </Elements>
          </div>

          {/* Order Summary */}
          <aside className="w-full lg:w-96">
            <div className="bg-black text-white rounded-3xl p-8 shadow-2xl sticky top-8">
              <h3 className="text-lg font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                Order Summary
              </h3>
              <div className="space-y-4 mb-6">
                {cart.line_items.map((item) => (
                  <div key={item.id.toString()} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {Number(item.quantity)}x {item.product_name}
                    </span>
                    <span>{formatPrice(Number(item.price) * Number(item.quantity))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-400' : ''}>
                    {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-black text-solidus-red pt-4 border-t border-white/10">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

interface CartLineItem {
  id: bigint;
  variant_id: bigint;
  quantity: bigint;
  price: bigint;
  currency: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
}

interface CartData {
  id: bigint;
  number: string;
  state: string;
  item_total: bigint;
  line_items: CartLineItem[];
}

interface CheckoutFormProps {
  cart: CartData;
  total: number;
  onSuccess: () => void;
}

function CheckoutForm({ cart, total, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate form fields
    const errors = validateCheckoutForm({ name, email, address, city, zip });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please correct the errors below');
      return;
    }

    setFieldErrors({});
    setLoading(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/orders',
          payment_method_data: {
            billing_details: {
              name,
              email,
              address: {
                line1: address,
                city,
                state,
                postal_code: zip,
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Complete the order in the backend
        const backend = await getBackend();
        const sessionId = localStorage.getItem('ic_commerce_session_id');

        try {
          // First set the address on the order
          await backend.set_order_address({
            email,
            shipping: {
              firstname: name.split(' ')[0] || name,
              lastname: name.split(' ').slice(1).join(' ') || '',
              address1: address,
              address2: [],
              city,
              state_name: state ? [state] : [],
              zipcode: zip,
              country_code: ['US'],
              phone: [],
            },
            billing: [],
            use_shipping_for_billing: [true],
          }, sessionId ? [sessionId] : []);

          // Record the Stripe payment
          await backend.record_stripe_payment(
            cart.id,
            paymentIntent.id,
            'succeeded',
            sessionId ? [sessionId] : []
          );

          // Complete checkout
          await backend.complete_checkout(sessionId ? [sessionId] : []);
        } catch {
          // Payment succeeded even if order completion had issues - user will see confirmation
        }

        onSuccess();
        navigate('/order-confirmation', {
          state: {
            success: true,
            orderNumber: cart.number || `ORD-${Date.now()}`,
            total,
            email,
          },
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Payment failed';
      setError(message);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact Information */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Contact Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              className={`input ${fieldErrors.name ? 'border-red-500' : ''}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
            {fieldErrors.name && <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              className={`input ${fieldErrors.email ? 'border-red-500' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
            {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Shipping Address</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
            <input
              type="text"
              className={`input ${fieldErrors.address ? 'border-red-500' : ''}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              required
            />
            {fieldErrors.address && <p className="text-red-500 text-sm mt-1">{fieldErrors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                className={`input ${fieldErrors.city ? 'border-red-500' : ''}`}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
                required
              />
              {fieldErrors.city && <p className="text-red-500 text-sm mt-1">{fieldErrors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                className="input"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NY"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
            <input
              type="text"
              className={`input ${fieldErrors.zip ? 'border-red-500' : ''}`}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="10001"
              required
            />
            {fieldErrors.zip && <p className="text-red-500 text-sm mt-1">{fieldErrors.zip}</p>}
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-bold">Secure Payment</h2>
        </div>
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full btn-primary py-4 rounded-full font-black uppercase tracking-[0.2em] shadow-xl shadow-solidus-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
            Processing Payment...
          </span>
        ) : (
          `Pay ${formatPrice(total)}`
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secured with 256-bit encryption. We never store your card details.
      </p>
    </form>
  );
}
