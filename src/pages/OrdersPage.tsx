import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getBackend, formatPrice, formatDate } from '../lib/backend';
import { useAuth } from '../hooks/useAuth';

interface Order {
  id: bigint;
  number: string;
  state: string;
  total: bigint;
  item_count: bigint;
  payment_state: string | null;
  shipment_state: string | null;
  completed_at: bigint | null;
  created_at: bigint;
}

export default function OrdersPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const backend = await getBackend();
        const result = await backend.get_my_orders();

        if ('Ok' in result) {
          setOrders(result.Ok);
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
      loadOrders();
    }
  }, [isLoggedIn]);

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const getStatusBadge = (state: string, _paymentState: string | null, shipmentState: string | null) => {
    if (state === 'complete') {
      if (shipmentState === 'shipped') {
        return <span className="badge-success">Shipped</span>;
      }
      return <span className="badge-info">Processing</span>;
    }
    if (state === 'canceled') {
      return <span className="badge-danger">Canceled</span>;
    }
    return <span className="badge-warning">Pending</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">My Orders</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="spinner w-8 h-8" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
          <Link to="/products" className="btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id.toString()}
              to={`/orders/${order.number}`}
              className="card p-6 block hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-lg">{order.number}</span>
                    {getStatusBadge(order.state, order.payment_state, order.shipment_state)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Placed on {formatDate(order.created_at)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-lg">{formatPrice(order.total)}</div>
                  <div className="text-sm text-gray-500">
                    {Number(order.item_count)} {Number(order.item_count) === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
