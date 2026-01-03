import { useState, useEffect } from 'react';
import { getBackend } from '../../lib/backend';

interface PaymentMethod {
  id: bigint;
  name: string;
  method_type: string;
  description: string | null;
  active: boolean;
  test_mode: boolean | null;
  api_key_set: boolean;
  publishable_key: string | null;
}

export default function AdminPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editForm, setEditForm] = useState({
    api_key: '',
    publishable_key: '',
    webhook_secret: '',
    test_mode: false,
    active: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  async function loadMethods() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_get_payment_methods();
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

  function startEdit(method: PaymentMethod) {
    setEditingId(method.id);
    // Handle opt bool from Candid - it comes as [] or [boolean]
    const testModeValue = Array.isArray(method.test_mode)
      ? (method.test_mode[0] ?? false)
      : (method.test_mode ?? false);
    setEditForm({
      api_key: '', // Don't show existing secret key
      publishable_key: Array.isArray(method.publishable_key)
        ? (method.publishable_key[0] ?? '')
        : (method.publishable_key ?? ''),
      webhook_secret: '', // Don't show existing webhook secret
      test_mode: testModeValue,
      active: method.active,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ api_key: '', publishable_key: '', webhook_secret: '', test_mode: false, active: false });
  }

  async function handleSave(id: bigint) {
    setIsSaving(true);
    setError(null);
    try {
      const backend = await getBackend();
      const result = await backend.admin_update_payment_method(id, {
        name: [],
        description: [],
        active: [editForm.active],
        auto_capture: [],
        position: [],
        api_key: editForm.api_key ? [editForm.api_key] : [],
        publishable_key: [editForm.publishable_key],
        webhook_secret: editForm.webhook_secret ? [editForm.webhook_secret] : [],
        test_mode: [editForm.test_mode],
      });

      if ('Err' in result) {
        setError(result.Err);
      } else {
        setEditingId(null);
        loadMethods();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
      </div>

      {error && (
        <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">&times;</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-15 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Name</th>
              <th className="text-left p-4 font-medium text-gray-700">Type</th>
              <th className="text-left p-4 font-medium text-gray-700">Status</th>
              <th className="text-left p-4 font-medium text-gray-700">Test Mode</th>
              <th className="text-right p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {methods.map((method) => (
              <tr key={method.id.toString()} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium text-midnight">{method.name}</div>
                  <div className="text-xs text-gray-500">{method.description}</div>
                </td>
                <td className="p-4">
                  <span className="badge-gray">{method.method_type}</span>
                </td>
                <td className="p-4">
                  {method.active ? (
                    <span className="badge-success">Active</span>
                  ) : (
                    <span className="badge-danger">Inactive</span>
                  )}
                </td>
                <td className="p-4">
                  {method.method_type === 'stripe' ? (
                    method.test_mode ? (
                      <span className="badge-warning">Test Mode</span>
                    ) : (
                      <span className="badge-success">Live</span>
                    )
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => startEdit(method)}
                    className="text-blue hover:underline"
                  >
                    Configure
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Configuration Modal */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Configure Stripe</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    className="rounded border-gray-300 text-solidus-red focus:ring-solidus-red"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Payment Method</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editForm.test_mode}
                    onChange={(e) => setEditForm({ ...editForm, test_mode: e.target.checked })}
                    className="rounded border-gray-300 text-solidus-red focus:ring-solidus-red"
                  />
                  <span className="text-sm font-medium text-gray-700">Test Mode</span>
                </label>
              </div>

              <div>
                <label className="label">Publishable Key</label>
                <input
                  type="text"
                  value={editForm.publishable_key}
                  onChange={(e) => setEditForm({ ...editForm, publishable_key: e.target.value })}
                  className="input"
                  placeholder="pk_test_..."
                />
              </div>

              <div>
                <label className="label">Secret Key {methods.find(m => m.id === editingId)?.api_key_set && '(Set)'}</label>
                <input
                  type="password"
                  value={editForm.api_key}
                  onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
                  className="input"
                  placeholder="sk_test_..."
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing key</p>
              </div>

              <div>
                <label className="label">Webhook Signing Secret</label>
                <input
                  type="password"
                  value={editForm.webhook_secret}
                  onChange={(e) => setEditForm({ ...editForm, webhook_secret: e.target.value })}
                  className="input"
                  placeholder="whsec_..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in Stripe Dashboard &rarr; Developers &rarr; Webhooks. Leave blank to keep existing.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 p-6 border-t border-gray-100">
              <button onClick={cancelEdit} className="btn-secondary" disabled={isSaving}>Cancel</button>
              <button onClick={() => handleSave(editingId)} className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
