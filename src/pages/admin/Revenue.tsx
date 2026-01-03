import { useState, useEffect } from 'react';
import { getBackend, formatPrice, formatDate } from '../../lib/backend';

interface RevenueStats {
  total_revenue: bigint;
  total_orders: bigint;
  average_order_value: bigint;
  orders_today: bigint;
  revenue_today: bigint;
  orders_this_week: bigint;
  revenue_this_week: bigint;
  orders_this_month: bigint;
  revenue_this_month: bigint;
}

interface TopProduct {
  product_id: bigint;
  product_name: string;
  quantity_sold: bigint;
  revenue: bigint;
}

interface RecentOrder {
  id: bigint;
  number: string;
  total: bigint;
  created_at: bigint;
  email: [] | [string];
}

export default function AdminRevenue() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.get_revenue_stats();

      if ('Ok' in result) {
        setStats(result.Ok.stats);
        setTopProducts(result.Ok.top_products);
        setRecentOrders(result.Ok.recent_orders);
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-12">{error}</div>;
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatPrice(stats?.total_revenue || BigInt(0)),
      subtitle: 'All time',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      title: 'Revenue Today',
      value: formatPrice(stats?.revenue_today || BigInt(0)),
      subtitle: `${Number(stats?.orders_today || 0)} orders`,
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      title: 'Revenue This Week',
      value: formatPrice(stats?.revenue_this_week || BigInt(0)),
      subtitle: `${Number(stats?.orders_this_week || 0)} orders`,
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      title: 'Revenue This Month',
      value: formatPrice(stats?.revenue_this_month || BigInt(0)),
      subtitle: `${Number(stats?.orders_this_month || 0)} orders`,
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      title: 'Total Orders',
      value: Number(stats?.total_orders || 0).toString(),
      subtitle: 'Completed',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    },
    {
      title: 'Average Order Value',
      value: formatPrice(stats?.average_order_value || BigInt(0)),
      subtitle: 'Per order',
      icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-gray-500 mt-1">Financial overview and analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="card p-6">
            <div className="flex items-center">
              <div className="bg-gray-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Top Selling Products</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No sales data yet</div>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.product_id.toString()} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{product.product_name}</div>
                    <div className="text-sm text-gray-500">
                      {Number(product.quantity_sold)} sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatPrice(product.revenue)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No orders yet</div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id.toString()} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{order.number}</div>
                    <div className="text-sm text-gray-500">
                      {order.email?.[0] || 'Guest'} &middot; {formatDate(order.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatPrice(order.total)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
