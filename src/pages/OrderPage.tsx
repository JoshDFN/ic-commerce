import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { getBackend, formatPrice, formatDate } from '../lib/backend';
import { useAuth } from '../hooks/useAuth';

interface LineItem {
  id: bigint;
  variant_id: bigint;
  quantity: bigint;
  price: bigint;
  product_name: string;
  product_slug: string;
  image_url: string | null;
}

interface Address {
  firstname: string;
  lastname: string;
  address1: string;
  address2: string | null;
  city: string;
  state_name: string | null;
  zipcode: string;
  country_code: string;
  phone: string | null;
}

interface Order {
  id: bigint;
  number: string;
  email: string | null;
  state: string;
  item_total: bigint;
  shipment_total: bigint;
  total: bigint;
  item_count: bigint;
  payment_state: string | null;
  shipment_state: string | null;
  completed_at: bigint | null;
  created_at: bigint;
  line_items: LineItem[];
  ship_address: Address | null;
  shipment: {
    tracking: string | null;
    shipping_method_name: string | null;
    shipped_at: bigint | null;
  } | null;
}

export default function OrderPage() {
  const { number } = useParams<{ number: string }>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!number) return;

      try {
        const backend = await getBackend();
        const result = await backend.get_order(number);

        if ('Ok' in result) {
          setOrder(result.Ok);
        } else {
          setError(result.Err);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoggedIn) {
      loadOrder();
    }
  }, [number, isLoggedIn]);

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 flex justify-center">
        <div className="spinner w-10 h-10 border-midnight border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-20 h-20 text-red-100 mx-auto mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-3xl font-black text-midnight tracking-tight mb-4">Order Not Found</h1>
          <p className="text-gray-500 mb-10 font-medium">{error || "We couldn't locate the order details you're looking for."}</p>
          <Link to="/products" className="w-full btn-primary py-4 rounded-full font-black uppercase tracking-widest shadow-xl shadow-solidus-red/20 inline-block">
            Return to Store
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    const base = "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm";
    if (order.state === 'complete') {
      if (order.shipment_state === 'shipped') {
        return <span className={`${base} bg-forest/10 text-forest border border-forest/20`}>Shipped</span>;
      }
      return <span className={`${base} bg-midnight text-white`}>Processing</span>;
    }
    if (order.state === 'canceled') {
      return <span className={`${base} bg-solidus-red text-white`}>Canceled</span>;
    }
    return <span className={`${base} bg-yellow/10 text-orange border border-orange/20`}>Pending</span>;
  };

  return (
    <div className="bg-sand min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <Link to="/products" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-midnight transition-all mb-4 inline-flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Keep Shopping
            </Link>
            <div className="flex items-center gap-6 mt-2">
              <h1 className="text-4xl font-black text-midnight tracking-tighter leading-none">Order Ref: {order.number}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-sm font-bold text-gray-400 mt-3 uppercase tracking-widest">
              Authenticated Transaction • {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        {/* Success message for new orders */}
        {order.state === 'complete' && order.completed_at !== null && (
          <div className="bg-white border-2 border-forest/20 rounded-3xl p-8 mb-12 shadow-xl shadow-forest/5 flex items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-forest flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-midnight tracking-tight mb-1">Success! Your drop is on the way.</h3>
              <p className="text-gray-500 font-medium">Thank you for supporting decentralized commerce. You'll receive updates as we process your order.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            {/* Items */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 bg-gray-15">
                <h2 className="text-[10px] font-black text-midnight uppercase tracking-[0.2em]">Package Manifest ({Number(order.item_count)} Items)</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {order.line_items.map((item) => (
                  <div key={item.id.toString()} className="p-8 flex items-center gap-8 group">
                    <Link to={`/products/${item.product_slug}`} className="w-24 h-32 shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm relative block">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.product_slug}`} className="text-lg font-black text-midnight hover:text-solidus-red transition-colors truncate block mb-1">
                        {item.product_name}
                      </Link>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        QTY: {Number(item.quantity)} • {formatPrice(item.price)} ea.
                      </p>
                    </div>

                    <div className="text-right font-black text-lg tracking-tighter text-midnight">
                      {formatPrice(Number(item.price) * Number(item.quantity))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {order.ship_address && (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Delivery Target</h3>
                  <address className="not-italic text-sm font-bold text-midnight leading-relaxed">
                    <span className="text-lg block mb-2">{order.ship_address.firstname} {order.ship_address.lastname}</span>
                    {order.ship_address.address1}<br />
                    {order.ship_address.address2 && <>{order.ship_address.address2}<br /></>}
                    {order.ship_address.city}, {order.ship_address.state_name} {order.ship_address.zipcode}<br />
                    <span className="text-[10px] font-black text-gray-300 uppercase mt-2 block">{order.ship_address.country_code}</span>
                  </address>
                </div>
              )}

              {order.shipment && (
                <div className="bg-midnight text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6">Shipment Intel</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black text-white/40 uppercase block mb-1">Carrier Method</span>
                      <span className="text-lg font-black tracking-tight">{order.shipment.shipping_method_name || "Protocol Standard"}</span>
                    </div>
                    {order.shipment.tracking && (
                      <div>
                        <span className="text-[10px] font-black text-white/40 uppercase block mb-1">Tracking ID</span>
                        <span className="font-mono text-sm bg-white/10 px-3 py-1 rounded-md block w-fit">{order.shipment.tracking}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area: Totals */}
          <aside className="lg:col-span-4 sticky top-32">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-[10px] font-black text-midnight uppercase tracking-[0.2em] mb-8 border-b border-gray-50 pb-6">Financial Summary</h3>

              <div className="space-y-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold text-midnight">{formatPrice(order.item_total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Protocol Shipping</span>
                  <span className="text-sm font-bold text-midnight">{formatPrice(order.shipment_total)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-gray-50 pt-8 mb-10">
                <span className="text-lg font-black text-midnight uppercase tracking-widest">Final Total</span>
                <span className="text-2xl font-black text-solidus-red tracking-tighter">{formatPrice(order.total)}</span>
              </div>

              {order.email && (
                <div className="bg-sand rounded-2xl p-6 border border-white/40">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Protocol Notification</span>
                  <p className="text-xs font-bold text-midnight leading-relaxed">Immutable receipt sent to:<br /><span className="text-solidus-red">{order.email}</span></p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
