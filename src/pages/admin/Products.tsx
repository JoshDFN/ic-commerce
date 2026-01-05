import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBackend, formatPrice, unwrapOpt } from '../../lib/backend';

interface Product {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  price: bigint;
  stock: bigint;
  image_url: string | null;
  available: boolean;
}

interface ProductImage {
  id: bigint;
  url: string;
  alt: string | null;
  position: bigint;
}

interface ProductForm {
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
  sku: string;
  taxon_ids: bigint[];
  images: ProductImage[];
  newImageUrl: string;
}

const emptyForm: ProductForm = {
  name: '',
  slug: '',
  description: '',
  price: '',
  stock: '0',
  image_url: '',
  sku: '',
  taxon_ids: [],
  images: [],
  newImageUrl: '',
};

// Types for Taxonomies
interface Taxon {
  id: bigint;
  name: string;
  parent_id: bigint | null; // Note: backend.did says opt int64
  depth: bigint;
}

interface Taxonomy {
  id: bigint;
  name: string;
  taxons: Taxon[]; // Simplify validation for now
}

import { useSettings } from '../../hooks/useSettings';

import { useSearchParams } from 'react-router-dom';

export default function AdminProducts() {
  const { settings, loading: settingsLoading } = useSettings();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<bigint | null>(null);

  useEffect(() => {
    if (!settingsLoading) {
      loadData();
    }
  }, [settingsLoading, searchParams]);

  async function loadData() {
    setIsLoading(true);
    try {
      const backend = await getBackend();

      // Load products
      const productsResult = await backend.get_products({
        per_page: [BigInt(100)],
        page: [],
        q: [],
        taxon_id: [],
        sort: [],
        in_stock: [],
      });

      // Load taxonomies for the form
      const taxonomiesResult = await backend.get_taxonomies();

      if ('Ok' in productsResult) {
        let fetchedProducts = productsResult.Ok.products;

        // Client-side filtering for 'low_stock'
        if (searchParams.get('filter') === 'low_stock') {
          const threshold = settings && settings['low_stock_threshold'] ? parseInt(settings['low_stock_threshold']) : 10;
          fetchedProducts = fetchedProducts.filter((p: Product) => {
            const stock = Number(p.stock);
            return stock <= threshold;
          });
        }
        setProducts(fetchedProducts);
      } else {
        if ('Err' in productsResult) setError(productsResult.Err);
      }

      if ('Ok' in taxonomiesResult) {
        setTaxonomies(taxonomiesResult.Ok);
      }

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function openAddModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  async function openEditModal(product: Product) {
    setEditingProduct(product);
    setFetchingDetails(true);
    setShowModal(true);

    // Initialize form with basic data first
    // Unwrap Candid optionals ([] | [T]) to plain values
    setForm({
      name: product.name,
      slug: product.slug,
      description: unwrapOpt(product.description as any) || '',
      price: (Number(product.price) / 100).toFixed(2),
      stock: Number(product.stock).toString(),
      image_url: unwrapOpt(product.image_url as any) || '',
      sku: '',
      taxon_ids: [],
      images: [],
      newImageUrl: '',
    });

    try {
      const backend = await getBackend();
      const result = await backend.get_product(product.id.toString());
      if ('Ok' in result) {
        const fullProduct = result.Ok;
        setForm(prev => ({
          ...prev,
          taxon_ids: fullProduct.taxons.map((t: any) => t.id),
          images: fullProduct.images.map((img: any) => ({
            id: img.id,
            url: img.url,
            alt: img.alt?.[0] || null,
            position: img.position,
          })),
        }));
      }
    } catch {
      // Product details fetch failed - form will show empty
    } finally {
      setFetchingDetails(false);
    }
  }

  function toggleTaxon(taxonId: bigint) {
    setForm(prev => {
      const exists = prev.taxon_ids.includes(taxonId);
      if (exists) {
        return { ...prev, taxon_ids: prev.taxon_ids.filter(id => id !== taxonId) };
      } else {
        return { ...prev, taxon_ids: [...prev.taxon_ids, taxonId] };
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const backend = await getBackend();
      const priceInCents = Math.round(parseFloat(form.price) * 100);
      const stockNum = parseInt(form.stock) || 0;

      if (editingProduct) {
        // Update existing product
        const result = await backend.update_product(editingProduct.id, {
          name: form.name ? [form.name] : [],
          slug: form.slug ? [form.slug] : [],
          description: form.description ? [form.description] : [],
          price: [BigInt(priceInCents)],
          stock: [BigInt(stockNum)],
          available_on: [],
          discontinue_on: [],
          meta_title: [],
          meta_description: [],
          taxon_ids: [form.taxon_ids],
        });

        if ('Err' in result) {
          setError(result.Err);
          return;
        }
      } else {
        // Create new product
        const result = await backend.create_product({
          name: form.name,
          slug: form.slug || generateSlug(form.name),
          description: form.description ? [form.description] : [],
          price: BigInt(priceInCents),
          stock: [BigInt(stockNum)],
          sku: form.sku ? [form.sku] : [],
          image_url: form.image_url ? [form.image_url] : [],
          available_on: [],
          backorderable: [],
          meta_title: [],
          meta_description: [],
          promotionable: [],
          taxon_ids: [form.taxon_ids],
        });

        if ('Err' in result) {
          setError(result.Err);
          return;
        }
      }

      setShowModal(false);
      loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddImage() {
    if (!editingProduct || !form.newImageUrl.trim()) return;

    try {
      const backend = await getBackend();
      const result = await backend.add_product_image(editingProduct.id, form.newImageUrl.trim(), []);

      if ('Ok' in result) {
        const newImage: ProductImage = {
          id: result.Ok,
          url: form.newImageUrl.trim(),
          alt: null,
          position: BigInt(form.images.length),
        };
        setForm(prev => ({
          ...prev,
          images: [...prev.images, newImage],
          newImageUrl: '',
        }));
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteImage(imageId: bigint) {
    try {
      const backend = await getBackend();

      // Check if the method exists (handles stale cache)
      if (typeof backend.delete_product_image !== 'function') {
        // Clear cache and retry once
        const { clearBackendCache } = await import('../../lib/backend');
        clearBackendCache();
        const freshBackend = await getBackend();
        if (typeof freshBackend.delete_product_image !== 'function') {
          setError('Please refresh the page to load updated backend methods.');
          return;
        }
        const result = await freshBackend.delete_product_image(imageId);
        if ('Ok' in result) {
          setForm(prev => ({
            ...prev,
            images: prev.images.filter(img => img.id !== imageId),
          }));
        } else {
          setError(result.Err);
        }
        return;
      }

      const result = await backend.delete_product_image(imageId);

      if ('Ok' in result) {
        setForm(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== imageId),
        }));
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(productId: bigint) {
    try {
      const backend = await getBackend();
      const result = await backend.delete_product(productId);

      if ('Err' in result) {
        setError(result.Err);
        return;
      }

      setDeleteConfirm(null);
      loadData();
    } catch (e: any) {
      setError(e.message);
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
        <h1 className="text-2xl font-bold">Products</h1>
        <button onClick={openAddModal} className="btn-primary">
          + Add Product
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            &times;
          </button>
        </div>
      )}

      <div className="card overflow-hidden border border-gray-100 rounded-lg">
        <table className="w-full table-fixed">
          <thead className="bg-gray-15 border-b border-gray-100 text-small text-gray-700">
            <tr>
              <th className="text-left p-4 font-normal text-xs uppercase tracking-wide">Product</th>
              <th className="text-left p-4 font-normal text-xs uppercase tracking-wide">Price</th>
              <th className="text-left p-4 font-normal text-xs uppercase tracking-wide">Stock</th>
              <th className="text-left p-4 font-normal text-xs uppercase tracking-wide">Status</th>
              <th className="text-right p-4 font-normal text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.map((product) => (
              <tr key={product.id.toString()} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900 text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-semibold text-sm text-gray-900">
                  {formatPrice(product.price)}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold ${Number(product.stock) > 0
                    ? 'text-gray-700 bg-gray-100'
                    : 'text-red-700 bg-red-100'
                    }`}>
                    {Number(product.stock)} in stock
                  </span>
                </td>
                <td className="p-4">
                  {product.available ? (
                    <span className="inline-flex items-center rounded-full whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold text-forest bg-seafoam">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100">
                      Draft
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-gray-500 hover:text-blue font-medium text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <Link
                      to={`/admin/products/${product.id}/variants`}
                      className="text-gray-500 hover:text-blue font-medium text-sm transition-colors"
                    >
                      Variants
                    </Link>
                    {deleteConfirm === product.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No products found. Add your first product!
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              {fetchingDetails && <span className="text-sm text-gray-400">Loading details...</span>}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label">Product Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="input"
                    placeholder={generateSlug(form.name) || 'auto-generated'}
                  />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="label">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="input"
                    disabled={!!editingProduct}
                  />
                </div>
              </div>

              <div>
                <label className="label">Taxonomies / Categories</label>
                <div className="space-y-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                  {taxonomies.map((taxonomy: any) => (
                    <div key={taxonomy.id.toString()}>
                      <h4 className="font-semibold text-gray-700 mb-2 text-sm">{taxonomy.name}</h4>
                      <div className="ml-2 space-y-1">
                        {taxonomy.taxons.map((taxon: any) => (
                          <div key={taxon.id.toString()} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`taxon-${taxon.id}`}
                              checked={form.taxon_ids.includes(taxon.id)}
                              onChange={() => toggleTaxon(taxon.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`taxon-${taxon.id}`} className="ml-2 text-sm text-gray-600">
                              {taxon.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {taxonomies.length === 0 && <span className="text-gray-400 text-sm">No taxonomies defined.</span>}
                </div>
              </div>

              <div>
                <label className="label">Product Images</label>
                {editingProduct ? (
                  <div className="space-y-4">
                    {/* Existing Images */}
                    {form.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-4">
                        {form.images.map((img, index) => (
                          <div key={img.id.toString()} className="relative group">
                            <img
                              src={img.url}
                              alt={img.alt || `Image ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-md border border-gray-200"
                            />
                            {index === 0 && (
                              <span className="absolute top-1 left-1 bg-blue text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                Primary
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img.id)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete image"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.images.length === 0 && (
                      <p className="text-gray-400 text-sm">No images yet. Add your first image below.</p>
                    )}

                    {/* Add New Image */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={form.newImageUrl}
                        onChange={(e) => setForm({ ...form, newImageUrl: e.target.value })}
                        className="input flex-1"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={handleAddImage}
                        disabled={!form.newImageUrl.trim()}
                        className="btn-secondary whitespace-nowrap"
                      >
                        + Add Image
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">First image will be used as the primary/thumbnail image.</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      className="input"
                      placeholder="https://example.com/image.jpg"
                    />
                    {form.image_url && (
                      <div className="mt-2">
                        <img
                          src={form.image_url}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-md"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">You can add more images after creating the product.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
