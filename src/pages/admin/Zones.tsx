import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBackend, unwrapOpt } from '../../lib/backend';

interface ZoneMember {
  id: bigint;
  zoneable_type: string;
  zoneable_id: string;
}

interface Zone {
  id: bigint;
  name: string;
  description: [] | [string];
  member_count: bigint;
  members: ZoneMember[];
}

export default function AdminZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    members: '',
  });

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.get_zones();
      if ('Ok' in result) {
        setZones(result.Ok);
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
      description: '',
      members: '',
    });
    setShowModal(true);
  }

  function openEditModal(zone: Zone) {
    setEditing(zone);
    setForm({
      name: zone.name,
      description: unwrapOpt(zone.description as any) || '',
      members: zone.members.map(m => m.zoneable_id).join(', '),
    });
    setShowModal(true);
  }

  async function handleSave() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const memberCodes = form.members.split(',').map(m => m.trim()).filter(Boolean);
      const memberInputs = memberCodes.map(code => ({
        zoneable_type: 'Country',
        zoneable_id: code,
      }));

      let result;
      if (editing) {
        result = await backend.admin_update_zone(editing.id, {
          name: form.name ? [form.name] : [],
          description: form.description ? [form.description] : [],
          members: memberInputs.length > 0 ? [memberInputs] : [],
        });
      } else {
        result = await backend.admin_create_zone({
          name: form.name,
          description: form.description ? [form.description] : [],
          members: memberInputs,
        });
      }

      if ('Ok' in result) {
        setShowModal(false);
        loadZones();
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
    if (confirm('Are you sure you want to delete this zone?')) {
      try {
        const backend = await getBackend();
        const result = await backend.admin_delete_zone(id);
        if ('Ok' in result) {
          loadZones();
        } else {
          setError(result.Err);
        }
      } catch (e: any) {
        setError(e.message);
      }
    }
  }

  if (isLoading && zones.length === 0) {
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
          <h1 className="text-2xl font-bold">Zones</h1>
          <p className="text-gray-500 mt-1">Define geographic zones for shipping and taxes</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          + Add Zone
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-15 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">Name</th>
              <th className="text-left p-4 font-medium text-gray-700">Description</th>
              <th className="text-left p-4 font-medium text-gray-700">Members</th>
              <th className="text-right p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.id.toString()} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">{zone.name}</td>
                <td className="p-4 text-gray-500">{unwrapOpt(zone.description as any) || '-'}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {zone.members.slice(0, 5).map((member, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded text-sm">
                        {member.zoneable_id}
                      </span>
                    ))}
                    {zone.members.length > 5 && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-sm">
                        +{zone.members.length - 5} more
                      </span>
                    )}
                    {zone.members.length === 0 && (
                      <span className="text-gray-400">No members</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => openEditModal(zone)}
                    className="text-blue hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No zones defined. Create your first zone to set up shipping regions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editing ? 'Edit Zone' : 'Add Zone'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="e.g., United States"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  placeholder="e.g., Continental US shipping"
                />
              </div>

              <div>
                <label className="label">Members (Country Codes)</label>
                <input
                  type="text"
                  value={form.members}
                  onChange={(e) => setForm({ ...form, members: e.target.value })}
                  className="input"
                  placeholder="e.g., US, CA, MX"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Comma-separated ISO country codes
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={!form.name}
              >
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
