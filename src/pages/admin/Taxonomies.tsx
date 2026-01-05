import { useState, useEffect } from 'react';
import { getBackend, unwrapOpt } from '../../lib/backend';

interface Taxon {
  id: bigint;
  name: string;
  permalink: string | null;
  parent_id: bigint | null;
  position: bigint;
  depth: bigint;
  product_count: bigint;
}

interface Taxonomy {
  id: bigint;
  name: string;
  position: bigint;
  taxons: Taxon[];
}

export default function AdminTaxonomies() {
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTaxon, setEditingTaxon] = useState<{ taxonomy: Taxonomy; taxon: Taxon | null } | null>(null);
  const [form, setForm] = useState({
    name: '',
    parent_id: '',
  });

  useEffect(() => {
    loadTaxonomies();
  }, []);

  async function loadTaxonomies() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.get_taxonomies();

      if ('Ok' in result) {
        setTaxonomies(result.Ok);
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openAddModal(taxonomy: Taxonomy, parentTaxon?: Taxon) {
    setEditingTaxon({ taxonomy, taxon: null });
    setForm({
      name: '',
      parent_id: parentTaxon ? parentTaxon.id.toString() : '',
    });
    setShowModal(true);
  }

  function openEditModal(taxonomy: Taxonomy, taxon: Taxon) {
    setEditingTaxon({ taxonomy, taxon });
    setForm({
      name: taxon.name,
      parent_id: unwrapOpt(taxon.parent_id as any)?.toString() || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingTaxon || !form.name) return;

    setIsLoading(true);
    try {
      const backend = await getBackend();
      let result;

      const parent_id = form.parent_id ? [BigInt(form.parent_id)] : [];

      if (editingTaxon.taxon) {
        // Update
        result = await backend.admin_update_taxon(editingTaxon.taxon.id, {
          name: [form.name],
          parent_id: parent_id as any, // backend expects parent_id directly if not Option
          permalink: [],
          position: [],
          description: [],
        });
      } else {
        // Create
        result = await backend.admin_create_taxon({
          taxonomy_id: editingTaxon.taxonomy.id,
          name: form.name,
          parent_id: parent_id.length > 0 ? parent_id : [],
          permalink: [],
          position: [],
          description: [],
        });
      }

      if ('Ok' in result) {
        setShowModal(false);
        loadTaxonomies();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCategory(id: bigint) {
    if (!confirm('Are you sure you want to delete this category and all its children?')) return;

    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_delete_taxon(id);

      if ('Ok' in result) {
        loadTaxonomies();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function renderTaxonTree(taxons: Taxon[], parentId: bigint | null = null, depth = 0): React.ReactElement[] {
    return taxons
      .filter(t => {
        if (parentId === null) return t.parent_id === null || t.depth === BigInt(0);
        return t.parent_id?.toString() === parentId.toString();
      })
      .sort((a, b) => Number(a.position) - Number(b.position))
      .flatMap(taxon => [
        <tr key={taxon.id.toString()} className="hover:bg-gray-50">
          <td className="p-4">
            <div style={{ paddingLeft: `${depth * 24}px` }} className="flex items-center">
              {depth > 0 && (
                <span className="text-gray-300 mr-2">└</span>
              )}
              <span className="font-medium">{taxon.name}</span>
            </div>
          </td>
          <td className="p-4 text-gray-500 text-sm">
            {taxon.permalink || '-'}
          </td>
          <td className="p-4 text-center">
            {Number(taxon.product_count)}
          </td>
          <td className="p-4 text-right">
            <button
              onClick={() => openAddModal(taxonomies.find(t => t.taxons.includes(taxon))!, taxon)}
              className="body-link mr-4"
            >
              Add Child
            </button>
            <button
              onClick={() => openEditModal(taxonomies.find(t => t.taxons.includes(taxon))!, taxon)}
              className="body-link mr-4"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteCategory(taxon.id)}
              className="text-red-500 hover:underline"
            >
              Delete
            </button>
          </td>
        </tr>,
        ...renderTaxonTree(taxons, taxon.id, depth + 1),
      ]);
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
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-500 mt-1">Organize your products into categories</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6">{error}</div>
      )}

      {taxonomies.map((taxonomy) => (
        <div key={taxonomy.id.toString()} className="card mb-6">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-lg">{taxonomy.name}</h2>
            <button
              onClick={() => openAddModal(taxonomy)}
              className="btn-secondary text-sm"
            >
              + Add Category
            </button>
          </div>

          <table className="w-full">
            <thead className="bg-gray-15 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">Name</th>
                <th className="text-left p-4 font-medium text-gray-700">Permalink</th>
                <th className="text-center p-4 font-medium text-gray-700">Products</th>
                <th className="text-right p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {renderTaxonTree(taxonomy.taxons)}
            </tbody>
          </table>

          {taxonomy.taxons.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No categories yet. Add your first category!
            </div>
          )}
        </div>
      ))}

      {taxonomies.length === 0 && (
        <div className="card p-12 text-center text-gray-500">
          No taxonomies found. Create a taxonomy to organize your products.
        </div>
      )}

      {/* Edit Modal */}
      {showModal && editingTaxon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">
                {editingTaxon.taxon ? 'Edit Category' : 'Add Category'}
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
                  placeholder="Category name"
                  required
                />
              </div>

              <div>
                <label className="label">Parent Category</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="input"
                >
                  <option value="">None (Top Level)</option>
                  {editingTaxon.taxonomy.taxons.map((t) => (
                    <option key={t.id.toString()} value={t.id.toString()}>
                      {'—'.repeat(Number(t.depth))} {t.name}
                    </option>
                  ))}
                </select>
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
