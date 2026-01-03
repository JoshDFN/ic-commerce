import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatPrice } from '../lib/backend';

interface LocationState {
  success?: boolean;
  orderNumber?: string;
  total?: number;
  email?: string;
}

export default function OrderConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<LocationState | null>(null);

  useEffect(() => {
    const locationState = location.state as LocationState | null;
    if (!locationState?.success) {
      // No valid state, redirect to home
      navigate('/');
      return;
    }
    setState(locationState);
    // Clear the state so refresh doesn't show the page again
    window.history.replaceState({}, document.title);
  }, [location, navigate]);

  if (!state?.success) {
    return null;
  }

  return (
    <div className="bg-sand min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-black text-midnight mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your purchase. Your order has been successfully placed.
          </p>

          {state.orderNumber && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <p className="text-sm text-gray-500 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-midnight">{state.orderNumber}</p>
            </div>
          )}

          {state.total && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <p className="text-sm text-gray-500 mb-1">Total Charged</p>
              <p className="text-2xl font-bold text-solidus-red">{formatPrice(state.total)}</p>
            </div>
          )}

          {state.email && (
            <p className="text-gray-600 mb-8">
              A confirmation email will be sent to <strong>{state.email}</strong>
            </p>
          )}

          <div className="space-y-4">
            <Link
              to="/products"
              className="block w-full btn-primary py-4 rounded-full font-bold uppercase tracking-wider"
            >
              Continue Shopping
            </Link>
            <Link
              to="/"
              className="block text-gray-500 hover:text-midnight transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
