import { useState, useEffect } from 'react';
import { getBackend, formatPrice, formatDate } from '../../lib/backend';


interface Customer {
  id: bigint;
  email: string;
  customer_type: string;
  principal: string | null;
  order_count: number;
  total_spent: bigint;
  first_order_at: bigint;
  last_order_at: bigint;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadCustomers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, typeFilter]);

  async function loadCustomers() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_get_customers({
        q: search ? [search] : [],
        customer_type: typeFilter ? [typeFilter] : [],
        page: [],
        per_page: [BigInt(50)],
      });

      if ('Ok' in result) {
        const custs = result.Ok.customers.map((c: any) => ({
          id: c.id,
          email: c.email,
          customer_type: c.customer_type,
          principal: c.principal?.[0] || null,
          order_count: Number(c.order_count),
          total_spent: c.total_spent,
          first_order_at: c.first_order_at,
          last_order_at: c.last_order_at,
        }));
        setCustomers(custs);
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="p-4 flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email..."
            className="input max-w-md"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">All Customers</option>
            <option value="registered">Registered (II)</option>
            <option value="guest">Guest Checkout</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-15 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Email</th>
              <th className="text-left p-4 font-medium text-gray-700">Type</th>
              <th className="text-left p-4 font-medium text-gray-700">First Order</th>
              <th className="text-left p-4 font-medium text-gray-700">Last Order</th>
              <th className="text-right p-4 font-medium text-gray-700">Orders</th>
              <th className="text-right p-4 font-medium text-gray-700">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((customer) => (
              <tr key={customer.id.toString()} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{customer.email}</div>
                  {customer.principal && (
                    <code className="text-xs text-gray-400">
                      {customer.principal.slice(0, 15)}...
                    </code>
                  )}
                </td>
                <td className="p-4">
                  <span className={customer.customer_type === 'registered' ? 'badge-info' : 'badge-gray'}>
                    {customer.customer_type === 'registered' ? 'Registered' : 'Guest'}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {formatDate(customer.first_order_at)}
                </td>
                <td className="p-4 text-gray-600">
                  {formatDate(customer.last_order_at)}
                </td>
                <td className="p-4 text-right">{customer.order_count}</td>
                <td className="p-4 text-right font-medium">
                  {formatPrice(customer.total_spent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {search || typeFilter ? 'No customers found matching your search.' : 'No customers yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
