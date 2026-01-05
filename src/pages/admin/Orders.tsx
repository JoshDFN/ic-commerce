import { useState, useEffect } from 'react';
import { getBackend, formatPrice, formatDate } from '../../lib/backend';
import { useToast } from '../../components/Toast';

interface Order {
  id: bigint;
  number: string;
  email: [] | [string];
  state: string;
  total: bigint;
  item_count: bigint;
  payment_state: [] | [string];
  shipment_state: [] | [string];
  tracking_number: [] | [string];
  completed_at: [] | [bigint];
  created_at: bigint;
}

interface OrderLineItem {
  id: bigint;
  variant_id: bigint;
  product_name: string;
  variant_sku: [] | [string];
  quantity: bigint;
  price: bigint;
  total: bigint;
}

interface OrderDetail {
  id: bigint;
  number: string;
  email: [] | [string];
  state: string;
  total: bigint;
  item_total: bigint;
  ship_address: [] | [{ address1: string; city: string; state_name: [] | [string]; zipcode: [] | [string]; country_code: string }];
  line_items: OrderLineItem[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<bigint | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [filter]);

  async function loadOrders() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_get_orders({
        page: [BigInt(1)],
        per_page: [BigInt(50)],
        state: filter ? [filter] : [],
        payment_state: [],
        shipment_state: [],
      });

      if ('Ok' in result) {
        setOrders(result.Ok.orders);
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusBadge = (order: Order) => {
    if (order.state === 'complete') {
      if (order.shipment_state[0] === 'shipped') {
        return <span className="badge-success">Shipped</span>;
      }
      return <span className="badge-info">Ready to Ship</span>;
    }
    if (order.state === 'canceled') {
      return <span className="badge-danger">Canceled</span>;
    }
    return <span className="badge-warning">{order.state}</span>;
  };

  const handleShipOrder = async (orderId: bigint) => {
    const tracking = prompt('Enter tracking number (optional):');

    try {
      const backend = await getBackend();
      const result = await backend.admin_ship_order(orderId, tracking ? [tracking] : []);

      if ('Ok' in result) {
        loadOrders();
        showToast('Order marked as shipped', 'success');
      } else {
        showToast('Failed: ' + result.Err, 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleEditTracking = async (orderId: bigint, currentTracking: string | undefined) => {
    const tracking = prompt('Enter tracking number:', currentTracking || '');

    // If user cancelled the prompt
    if (tracking === null) return;

    try {
      const backend = await getBackend();
      const result = await backend.admin_update_tracking(orderId, tracking ? [tracking] : []);

      if ('Ok' in result) {
        loadOrders();
        showToast('Tracking number updated', 'success');
      } else {
        showToast('Failed: ' + result.Err, 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const toggleOrderDetail = async (order: Order) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      setOrderDetail(null);
      return;
    }

    setExpandedOrderId(order.id);
    setLoadingDetail(true);

    try {
      const backend = await getBackend();
      const result = await backend.get_order(order.number);

      if ('Ok' in result) {
        setOrderDetail(result.Ok);
      }
    } catch {
      // Order detail fetch failed
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Orders</option>
          <option value="complete">Completed</option>
          <option value="cart">Cart</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solidus-red"></div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead className="bg-gray-15 text-gray-700 text-left text-xs">
              <tr>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[110px]">Order</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[100px]">State</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[100px]">Date</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide">Customer</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide text-right w-[90px]">Total</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[70px]">Items</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[100px]">Payment</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[90px]">Shipment</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide w-[160px]">Tracking</th>
                <th className="p-4 font-normal text-xs uppercase tracking-wide text-right w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white text-3.5 line-[150%] text-black">
              {orders.map((order) => {
                // Determine row fade based on status (Solidus logic)
                const isFaded = order.state === 'canceled';
                const isExpanded = expandedOrderId === order.id;
                const rowClass = `border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${isFaded ? 'bg-gray-15 text-gray-700' : ''} ${isExpanded ? 'bg-sky/30' : ''}`;

                return (
                  <>
                  <tr key={order.id.toString()} className={rowClass} onClick={() => toggleOrderDetail(order)}>
                    <td className="p-4 font-semibold">
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {order.number}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order)}
                    </td>
                    <td className="p-4 text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-black">{order.email[0] || 'Guest Consumer'}</div>
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {formatPrice(order.total)}
                    </td>
                    <td className="p-4 text-gray-500">
                      {Number(order.item_count)} {Number(order.item_count) === 1 ? 'Item' : 'Items'}
                    </td>
                    <td className="p-4">
                      {/* Payment Status Badge */}
                      {order.payment_state[0] ? (
                        <span className={`inline-flex items-center rounded-full whitespace-nowrap px-3 py-0.5 text-sm font-semibold ${order.payment_state[0] === 'paid' ? 'text-forest bg-seafoam' : 'text-orange bg-papaya-whip'
                          }`}>
                          {order.payment_state[0] === 'paid' ? 'Paid' : 'Balance Due'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full whitespace-nowrap px-3 py-0.5 text-sm font-semibold text-black bg-graphite-light">
                          -
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {/* Shipment Status Badge */}
                      {order.shipment_state[0] ? (
                        <span className={`inline-flex items-center rounded-full whitespace-nowrap px-3 py-0.5 text-sm font-semibold ${order.shipment_state[0] === 'shipped' ? 'text-forest bg-seafoam' :
                          order.shipment_state[0] === 'ready' ? 'text-blue bg-sky' : 'text-orange bg-papaya-whip'
                          }`}>
                          {order.shipment_state[0] === 'shipped' ? 'Shipped' :
                            order.shipment_state[0] === 'ready' ? 'Ready' : 'Pending'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full whitespace-nowrap px-3 py-0.5 text-sm font-semibold text-black bg-graphite-light">
                          -
                        </span>
                      )}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {order.shipment_state?.[0] ? (
                        <button
                          onClick={() => handleEditTracking(order.id, order.tracking_number?.[0])}
                          className="text-left hover:bg-gray-100 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
                          title="Click to edit tracking number"
                        >
                          {order.tracking_number?.[0] ? (
                            <span className="font-mono text-sm">{order.tracking_number[0]}</span>
                          ) : (
                            <span className="text-blue text-sm">+ Add tracking</span>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {order.state === 'complete' && order.shipment_state?.[0] !== 'shipped' && (
                        <button
                          onClick={() => handleShipOrder(order.id)}
                          className="text-blue hover:underline text-sm font-medium"
                        >
                          Mark Shipped
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Order Detail Row */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={10} className="p-6">
                        {loadingDetail ? (
                          <div className="flex justify-center py-4">
                            <div className="spinner w-6 h-6" />
                          </div>
                        ) : orderDetail ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Line Items */}
                            <div>
                              <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Items Ordered</h4>
                              <div className="space-y-2">
                                {orderDetail.line_items.map((item) => (
                                  <div key={item.id.toString()} className="flex justify-between items-center bg-white p-3 rounded border border-gray-100">
                                    <div>
                                      <div className="font-medium">{item.product_name}</div>
                                      <div className="text-sm text-gray-500">
                                        {item.variant_sku?.[0] && <>SKU: {item.variant_sku[0]} &middot; </>}Qty: {Number(item.quantity)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">{formatPrice(item.total)}</div>
                                      <div className="text-sm text-gray-500">{formatPrice(item.price)} each</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Shipping Address */}
                            <div>
                              <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Shipping Address</h4>
                              {orderDetail.ship_address?.[0] ? (
                                <div className="bg-white p-4 rounded border border-gray-100">
                                  <div>{orderDetail.ship_address[0].address1}</div>
                                  <div>
                                    {orderDetail.ship_address[0].city}
                                    {orderDetail.ship_address[0].state_name?.[0] && `, ${orderDetail.ship_address[0].state_name[0]}`}
                                    {orderDetail.ship_address[0].zipcode?.[0] && ` ${orderDetail.ship_address[0].zipcode[0]}`}
                                  </div>
                                  <div>{orderDetail.ship_address[0].country_code}</div>
                                </div>
                              ) : (
                                <div className="text-gray-400 italic">No shipping address</div>
                              )}

                              <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mt-6 mb-3">Order Summary</h4>
                              <div className="bg-white p-4 rounded border border-gray-100 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Subtotal</span>
                                  <span>{formatPrice(orderDetail.item_total)}</span>
                                </div>
                                <div className="flex justify-between font-semibold border-t pt-2">
                                  <span>Total</span>
                                  <span>{formatPrice(orderDetail.total)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400">Failed to load order details</div>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                )
              })}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white">
              No orders found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
