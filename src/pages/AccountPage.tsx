import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getBackend, formatPrice, formatDate } from '../lib/backend';

interface OrderSummary {
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

export default function AccountPage() {
  const { isLoggedIn, isLoading: authLoading, principal, logout } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'settings'>('orders');

  useEffect(() => {
    if (isLoggedIn) {
      loadOrders();
    }
  }, [isLoggedIn]);

  async function loadOrders() {
    try {
      const backend = await getBackend();
      const result = await backend.get_my_orders();

      if ('Ok' in result) {
        setOrders(result.Ok);
      }
    } catch (e: any) {
      console.error('Failed to load orders:', e);
    } finally {
      setIsLoading(false);
    }
  }

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

  const getStatusBadge = (order: OrderSummary) => {
    if (order.state === 'complete') {
      if (order.shipment_state === 'shipped') {
        return <span className="badge-success">Shipped</span>;
      }
      return <span className="badge-info">Processing</span>;
    }
    if (order.state === 'canceled') {
      return <span className="badge-danger">Canceled</span>;
    }
    return <span className="badge-warning">Pending</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Account</h1>
        <button onClick={logout} className="btn-secondary">
          Sign Out
        </button>
      </div>

      {/* Principal ID */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Principal ID</div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
              {principal}
            </code>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-solidus-red text-solidus-red'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'addresses'
                ? 'border-solidus-red text-solidus-red'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Addresses
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-solidus-red text-solidus-red'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="spinner w-8 h-8" />
            </div>
          ) : orders.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-15 border-b border-gray-100">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Order</th>
                    <th className="text-left p-4 font-medium text-gray-700">Date</th>
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                    <th className="text-right p-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id.toString()} className="hover:bg-gray-50">
                      <td className="p-4">
                        <Link
                          to={`/orders/${order.number}`}
                          className="font-medium body-link"
                        >
                          {order.number}
                        </Link>
                        <div className="text-sm text-gray-500">
                          {Number(order.item_count)} {Number(order.item_count) === 1 ? 'item' : 'items'}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(order)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatPrice(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
              <Link to="/products" className="btn-primary">
                Start Shopping
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold">Saved Addresses</h2>
            <button className="btn-secondary">+ Add Address</button>
          </div>
          <div className="text-center py-8 text-gray-500">
            No saved addresses yet. Add an address during checkout.
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card p-6">
          <h2 className="font-semibold mb-6">Account Settings</h2>

          <div className="space-y-6">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input max-w-md"
                placeholder="Enter your email"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for order confirmations and updates
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
