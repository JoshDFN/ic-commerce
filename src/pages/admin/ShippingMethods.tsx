import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBackend, formatPrice, unwrapOpt } from '../../lib/backend';

interface ShippingMethod {
  id: bigint;
  name: string;
  code: string | null;
  carrier: string | null;
  service_level: string | null;
  cost: bigint;
  admin_name: string | null;
  display_on: string | null;
  tracking_url: string | null;
  active: boolean;
}

export default function AdminShippingMethods() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShippingMethod | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    carrier: '',
    service_level: '',
    cost: '',
    tracking_url: '',
    active: true,
  });

  useEffect(() => {
    loadMethods();
  }, []);

  async function loadMethods() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_get_shipping_methods();

      if ('Ok' in result) {
        setMethods(result.Ok);
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openAddModal() {
    setEditing(null);
    setForm({
      name: '',
      code: '',
      carrier: '',
      service_level: '',
      cost: '',
      tracking_url: '',
      active: true,
    });
    setShowModal(true);
  }

  function openEditModal(method: ShippingMethod) {
    setEditing(method);
    setForm({
      name: method.name,
      code: unwrapOpt(method.code as any) || '',
      carrier: unwrapOpt(method.carrier as any) || '',
      service_level: unwrapOpt(method.service_level as any) || '',
      cost: (Number(method.cost) / 100).toFixed(2),
      tracking_url: unwrapOpt(method.tracking_url as any) || '',
      active: method.active,
    });
    setShowModal(true);
  }

  async function handleSave() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const base_cost = BigInt(Math.round(parseFloat(form.cost) * 100));

      let result;
      if (editing) {
        result = await backend.admin_update_shipping_method(editing.id, {
          name: [form.name],
          admin_name: [form.carrier], // Using carrier as admin_name for now or separate field
          code: [form.code],
          carrier: [form.carrier],
          service_level: [form.service_level],
          tracking_url: [form.tracking_url],
          display_on: [],
          base_cost: [base_cost],
          active: [form.active],
        });
      } else {
        result = await backend.admin_create_shipping_method({
          name: form.name,
          admin_name: [form.carrier],
          code: [form.code],
          carrier: [form.carrier],
          service_level: [form.service_level],
          tracking_url: [form.tracking_url],
          display_on: [],
          base_cost,
          active: [form.active],
        });
      }

      if ('Ok' in result) {
        setShowModal(false);
        loadMethods();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!confirm('Are you sure you want to delete this shipping method?')) return;
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_delete_shipping_method(id);
      if ('Ok' in result) {
        loadMethods();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/admin/settings" className="body-link text-sm mb-2 block">
            &larr; Back to settings
          </Link>
          <h1 className="text-2xl font-bold">Shipping Methods</h1>
          <p className="text-gray-500 mt-1">Configure shipping options for your store</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          + Add Shipping Method
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-15 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Name</th>
              <th className="text-left p-4 font-medium text-gray-700">Carrier</th>
              <th className="text-left p-4 font-medium text-gray-700">Service Level</th>
              <th className="text-right p-4 font-medium text-gray-700">Cost</th>
              <th className="text-center p-4 font-medium text-gray-700">Status</th>
              <th className="text-right p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {methods.map((method) => (
              <tr key={method.id.toString()} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{method.name}</div>
                  {method.code && (
                    <div className="text-sm text-gray-500">{method.code}</div>
                  )}
                </td>
                <td className="p-4 text-gray-600">
                  {method.carrier || '-'}
                </td>
                <td className="p-4 text-gray-600">
                  {method.service_level || '-'}
                </td>
                <td className="p-4 text-right font-medium">
                  {formatPrice(method.cost)}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-sm ${method.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {method.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => openEditModal(method)}
                    className="body-link mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {methods.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No shipping methods configured.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">
                {editing ? 'Edit Shipping Method' : 'Add Shipping Method'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Standard Shipping"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="input"
                    placeholder="STANDARD"
                  />
                </div>
                <div>
                  <label className="label">Cost (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="input"
                    placeholder="5.99"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Carrier</label>
                  <input
                    type="text"
                    value={form.carrier}
                    onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    className="input"
                    placeholder="USPS, UPS, FedEx..."
                  />
                </div>
                <div>
                  <label className="label">Service Level</label>
                  <input
                    type="text"
                    value={form.service_level}
                    onChange={(e) => setForm({ ...form, service_level: e.target.value })}
                    className="input"
                    placeholder="Ground, Express..."
                  />
                </div>
              </div>

              <div>
                <label className="label">Tracking URL Template</label>
                <input
                  type="text"
                  value={form.tracking_url}
                  onChange={(e) => setForm({ ...form, tracking_url: e.target.value })}
                  className="input"
                  placeholder="https://track.carrier.com/?number=:tracking"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use :tracking as placeholder for the tracking number
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Active (visible to customers)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
