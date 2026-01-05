import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBackend, formatPrice, formatDate } from '../../lib/backend';

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
  id: bigint;
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

interface Adjustment {
  id: bigint;
  label: string;
  amount: bigint;
  included: boolean;
}

interface Payment {
  id: bigint;
  amount: bigint;
  state: string;
  payment_method_name: string;
  created_at: bigint;
}

interface Order {
  id: bigint;
  number: string;
  email: string | null;
  state: string;
  item_total: bigint;
  shipment_total: bigint;
  adjustment_total: bigint;
  total: bigint;
  item_count: bigint;
  payment_state: string | null;
  shipment_state: string | null;
  completed_at: bigint | null;
  created_at: bigint;
  line_items: LineItem[];
  ship_address: Address | null;
  bill_address: Address | null;
  shipment: {
    id: bigint;
    number: string;
    state: string;
    cost: bigint;
    tracking: string | null;
    shipping_method_name: string | null;
    shipped_at: bigint | null;
  } | null;
  adjustments: Adjustment[];
  payments: Payment[];
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showShipModal, setShowShipModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReasonId, setRefundReasonId] = useState<bigint | null>(null);
  const [refundReasons, setRefundReasons] = useState<{ id: bigint, name: string }[]>([]);

  useEffect(() => {
    loadOrder();
    loadRefundReasons();
  }, [id]);

  async function loadRefundReasons() {
    try {
      const backend = await getBackend();
      const result = await backend.get_refund_reasons();
      if ('Ok' in result) setRefundReasons(result.Ok);
    } catch {
      // Refund reasons load failed - will show empty list
    }
  }

  async function handleRefund() {
    if (!selectedPayment || !refundAmount || !refundReasonId) return;
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_create_refund({
        payment_id: selectedPayment.id,
        amount: BigInt(refundAmount),
        reason_id: refundReasonId,
      });

      if ('Ok' in result) {
        setShowRefundModal(false);
        setRefundAmount('');
        loadOrder();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    if (!id) return;
    setIsLoading(true);
    try {
      const backend = await getBackend();
      // We need to get order by number, but we have ID
      // For now, we'll use admin_get_orders and filter
      const result = await backend.admin_get_orders({
        page: [],
        per_page: [BigInt(1000)],
        state: [],
        payment_state: [],
        shipment_state: [],
      });

      if ('Ok' in result) {
        const found = result.Ok.orders.find((o: { id: bigint; number: string }) => o.id.toString() === id);
        if (found) {
          // Get full order details
          const detailResult = await backend.get_order(found.number);
          if ('Ok' in detailResult) {
            setOrder(detailResult.Ok as Order);
          }
        }
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleShipOrder() {
    if (!order) return;
    try {
      const backend = await getBackend();
      const result = await backend.admin_ship_order(
        order.id,
        trackingNumber ? [trackingNumber] : []
      );

      if ('Ok' in result) {
        setShowShipModal(false);
        setTrackingNumber('');
        loadOrder();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleCancelOrder() {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;
    try {
      const backend = await getBackend();
      const result = await backend.admin_update_order_state(order.id, 'canceled');

      if ('Ok' in result) {
        loadOrder();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  const getStateBadge = (state: string) => {
    const colors: Record<string, string> = {
      complete: 'badge-success',
      canceled: 'badge-danger',
      cart: 'badge-gray',
      address: 'badge-warning',
      payment: 'badge-warning',
    };
    return colors[state] || 'badge-warning';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Order not found</h1>
        <Link to="/admin/orders" className="body-link">&larr; Back to orders</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/admin/orders" className="body-link text-sm mb-2 block">
            &larr; Back to orders
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Order {order.number}</h1>
            <span className={getStateBadge(order.state)}>{order.state}</span>
            {order.payment_state && (
              <span className={order.payment_state === 'paid' ? 'badge-success' : 'badge-warning'}>
                {order.payment_state}
              </span>
            )}
            {order.shipment_state && (
              <span className={order.shipment_state === 'shipped' ? 'badge-success' : 'badge-info'}>
                {order.shipment_state}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">
            Placed on {formatDate(order.created_at)} {order.email && `by ${order.email}`}
          </p>
        </div>

        <div className="flex gap-3">
          {order.state === 'complete' && order.shipment_state !== 'shipped' && (
            <button onClick={() => setShowShipModal(true)} className="btn-primary">
              Mark as Shipped
            </button>
          )}
          {order.state !== 'canceled' && order.state !== 'complete' && (
            <button onClick={handleCancelOrder} className="btn-danger">
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold">Items ({Number(order.item_count)})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.line_items.map((item) => (
                <div key={item.id.toString()} className="p-4 flex gap-4">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-sm text-gray-500">
                      {Number(item.quantity)} × {formatPrice(item.price)}
                    </div>
                  </div>
                  <div className="text-right font-medium">
                    {formatPrice(Number(item.price) * Number(item.quantity))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustments */}
          {order.adjustments.length > 0 && (
            <div className="card">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold">Adjustments</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {order.adjustments.map((adj) => (
                  <div key={adj.id.toString()} className="p-4 flex justify-between text-sm">
                    <div>
                      <div className="font-medium">{adj.label}</div>
                      {adj.included && <div className="text-xs text-gray-500">Included in price</div>}
                    </div>
                    <div className={adj.amount < 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                      {formatPrice(adj.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments */}
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold">Payments</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.payments.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No payments found</div>
              ) : (
                order.payments.map((p) => (
                  <div key={p.id.toString()} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{p.payment_method_name}</div>
                      <div className="text-xs text-gray-500">{formatDate(p.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium text-sm">{formatPrice(p.amount)}</div>
                        <div className={`text-xs ${p.state === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>{p.state}</div>
                      </div>
                      {p.state === 'completed' && (
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setShowRefundModal(true);
                          }}
                          className="btn-secondary py-1 text-xs"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-6">
            {order.ship_address && (
              <div className="card p-4">
                <h3 className="font-semibold mb-3">Shipping Address</h3>
                <address className="not-italic text-gray-600 text-sm">
                  {order.ship_address.firstname} {order.ship_address.lastname}<br />
                  {order.ship_address.address1}<br />
                  {order.ship_address.address2 && <>{order.ship_address.address2}<br /></>}
                  {order.ship_address.city}, {order.ship_address.state_name} {order.ship_address.zipcode}<br />
                  {order.ship_address.country_code}
                  {order.ship_address.phone && <><br />{order.ship_address.phone}</>}
                </address>
              </div>
            )}
            {order.bill_address && (
              <div className="card p-4">
                <h3 className="font-semibold mb-3">Billing Address</h3>
                <address className="not-italic text-gray-600 text-sm">
                  {order.bill_address.firstname} {order.bill_address.lastname}<br />
                  {order.bill_address.address1}<br />
                  {order.bill_address.address2 && <>{order.bill_address.address2}<br /></>}
                  {order.bill_address.city}, {order.bill_address.state_name} {order.bill_address.zipcode}<br />
                  {order.bill_address.country_code}
                </address>
              </div>
            )}
          </div>

          {/* Shipment */}
          {order.shipment && (
            <div className="card p-4">
              <h3 className="font-semibold mb-3">Shipment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Number:</span>
                  <span className="ml-2">{order.shipment.number}</span>
                </div>
                <div>
                  <span className="text-gray-500">State:</span>
                  <span className="ml-2">{order.shipment.state}</span>
                </div>
                <div>
                  <span className="text-gray-500">Method:</span>
                  <span className="ml-2">{order.shipment.shipping_method_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cost:</span>
                  <span className="ml-2">{formatPrice(order.shipment.cost)}</span>
                </div>
                {order.shipment.tracking && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Tracking:</span>
                    <span className="ml-2 font-mono">{order.shipment.tracking}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-4">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(order.item_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>{formatPrice(order.shipment_total)}</span>
              </div>
              {Number(order.adjustment_total) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Adjustments</span>
                  <span>{formatPrice(order.adjustment_total)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ship Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Ship Order</h2>
            </div>
            <div className="p-6">
              <label className="label">Tracking Number (optional)</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="input"
                placeholder="Enter tracking number"
              />
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowShipModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleShipOrder} className="btn-primary">
                Mark as Shipped
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Refund Payment</h2>
              <p className="text-sm text-gray-500 mt-1">
                Payment: {selectedPayment.payment_method_name} ({formatPrice(selectedPayment.amount)})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Refund Amount</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="input"
                  placeholder="Enter amount to refund"
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <select
                  className="input"
                  value={refundReasonId?.toString() || ''}
                  onChange={(e) => setRefundReasonId(e.target.value ? BigInt(e.target.value) : null)}
                >
                  <option value="">Select a reason</option>
                  {refundReasons.map((r) => (
                    <option key={r.id.toString()} value={r.id.toString()}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowRefundModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleRefund}
                className="btn-danger"
                disabled={!refundAmount || !refundReasonId || isLoading}
              >
                {isLoading ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
