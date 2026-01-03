import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../lib/backend';
import { useState } from 'react';

function CouponForm({ onApply }: { onApply: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsSubmitting(true);
    setMsg(null);
    try {
      await onApply(code);
      setMsg({ type: 'success', text: 'Coupon applied successfully!' });
      setCode('');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to apply coupon' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Coupon Code"
          className="input flex-1 py-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          className="btn-secondary py-1"
          disabled={isSubmitting || !code}
        >
          {isSubmitting ? '...' : 'Apply'}
        </button>
      </form>
      {msg && (
        <p className={`text-xs mt-1 ${msg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

export default function CartPage() {
  const { cart, isLoading, error, updateQuantity, removeItem, applyCoupon } = useCart();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 flex justify-center">
        <div className="spinner w-10 h-10 border-midnight border-t-transparent" />
      </div>
    );
  }

  // Guest checkout is supported - no login required to view cart

  if (!cart || cart.line_items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-20 h-20 text-gray-100 mx-auto mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h1 className="text-3xl font-black text-midnight tracking-tight mb-4">Your Bag is Empty</h1>
          <p className="text-gray-500 mb-10 font-medium">It feels a bit light in here. Why not browse our latest decentralized drops?</p>
          <Link to="/products" className="w-full btn-primary py-4 rounded-full font-black uppercase tracking-widest shadow-xl shadow-solidus-red/20 inline-block">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-baseline justify-between mb-12 border-b border-gray-100 pb-8">
        <h1 className="text-4xl font-black text-midnight tracking-tighter">Shopping Bag</h1>
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{Number(cart.item_count)} Items</span>
      </div>

      {error && (
        <div className="bg-red-50 text-solidus-red p-6 rounded-2xl mb-10 border border-red-100 font-bold text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-8 space-y-8">
          {cart.line_items.map((item) => (
            <div key={item.id.toString()} className="group flex flex-col sm:flex-row gap-8 items-start sm:items-center py-8 border-b border-gray-100 last:border-0 first:pt-0">
              {/* Image */}
              <Link to={`/products/${item.product_slug}`} className="w-32 h-40 shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm relative block">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <Link to={`/products/${item.product_slug}`} className="text-xl font-black text-midnight hover:text-solidus-red transition-colors tracking-tight truncate pr-4">
                    {item.product_name}
                  </Link>
                  <span className="text-xl font-black text-midnight tracking-tighter shrink-0">
                    {formatPrice(Number(item.price) * Number(item.quantity))}
                  </span>
                </div>

                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                  {formatPrice(item.price)} per unit
                </p>

                <div className="flex items-center justify-between">
                  {/* Quantity Control */}
                  <div className="inline-flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                    <button
                      onClick={() => updateQuantity(item.id, Number(item.quantity) - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-midnight disabled:opacity-30 transition-all font-bold"
                      disabled={Number(item.quantity) <= 1}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth="3" strokeLinecap="round" /></svg>
                    </button>
                    <span className="w-10 text-center text-xs font-black text-midnight">{Number(item.quantity)}</span>
                    <button
                      onClick={() => updateQuantity(item.id, Number(item.quantity) + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-midnight transition-all font-bold"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" /></svg>
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-solidus-red transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 sticky top-32 shadow-sm">
            <h2 className="text-xl font-black text-midnight uppercase tracking-widest mb-8 border-b border-gray-50 pb-6">Summary</h2>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-bold text-midnight">{formatPrice(cart.item_total)}</span>
              </div>

              {cart.adjustments.map((adj) => (
                <div key={adj.id.toString()} className="flex justify-between items-center group">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest group-hover:text-solidus-red transition-colors">{adj.label}</span>
                  <span className={`text-sm font-bold ${adj.amount < 0 ? 'text-forest' : 'text-midnight'}`}>
                    {adj.amount < 0 ? '-' : ''}{formatPrice(Math.abs(Number(adj.amount)))}
                  </span>
                </div>
              ))}

              {Number(cart.shipment_total) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Estimated Shipping</span>
                  <span className="text-sm font-bold text-midnight">{formatPrice(cart.shipment_total)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-gray-50 pt-8 mb-10">
              <span className="text-lg font-black text-midnight uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-midnight tracking-tighter">{formatPrice(cart.total)}</span>
            </div>

            {/* Coupon Code */}
            <CouponForm onApply={applyCoupon} />

            <div className="space-y-4 pt-10">
              <Link to="/checkout" className="w-full btn-primary py-5 rounded-full font-black uppercase tracking-[0.2em] shadow-xl shadow-solidus-red/20 text-center block text-sm">
                Checkout
              </Link>
              <Link to="/products" className="w-full py-4 text-center block text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-midnight transition-colors">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
