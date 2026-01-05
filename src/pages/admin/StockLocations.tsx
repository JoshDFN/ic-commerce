import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBackend, unwrapOpt } from '../../lib/backend';

interface StockLocation {
  id: bigint;
  name: string;
  code: string | null;
  active: boolean;
  address1: string | null;
  city: string | null;
  state_name: string | null;
  country_code: string;
  zipcode: string | null;
  is_default: boolean;
}

interface StockItem {
  id: bigint;
  variant_id: bigint;
  variant_sku: string;
  product_name: string;
  count_on_hand: bigint;
  backorderable: boolean;
}

export default function AdminStockLocations() {
  const [searchParams] = useSearchParams();
  const showLowStockOnly = searchParams.get('filter') === 'low_stock';

  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<StockLocation | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    address1: '',
    city: '',
    state_name: '',
    zipcode: '',
    country_code: 'US',
    is_default: false,
  });

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<StockItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [deletingLocation, setDeletingLocation] = useState<StockLocation | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (showLowStockOnly) {
      // Load all low stock items across all locations
      loadStockItems(null);
    } else if (selectedLocation) {
      loadStockItems(selectedLocation.id);
    }
  }, [selectedLocation, showLowStockOnly]);

  async function loadLocations() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_get_stock_locations();
      if ('Ok' in result) {
        setLocations(result.Ok);
        if (result.Ok.length > 0 && !selectedLocation) {
          setSelectedLocation(result.Ok[0]);
        }
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStockItems(locationId: bigint | null) {
    try {
      const backend = await getBackend();
      const result = await backend.admin_get_stock_items({
        stock_location_id: locationId ? [locationId] : [],
        low_stock: showLowStockOnly ? [true] : [],
        q: [],
        page: [],
        per_page: [BigInt(100)],
      });
      if ('Ok' in result) {
        setStockItems(result.Ok.items);
      }
    } catch {
      // Stock items load failed
    }
  }

  function openAddLocationModal() {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      code: '',
      address1: '',
      city: '',
      state_name: '',
      zipcode: '',
      country_code: 'US',
      is_default: false,
    });
    setShowLocationModal(true);
  }

  function openEditLocationModal(location: StockLocation) {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      code: unwrapOpt(location.code as any) || '',
      address1: unwrapOpt(location.address1 as any) || '',
      city: unwrapOpt(location.city as any) || '',
      state_name: unwrapOpt(location.state_name as any) || '',
      zipcode: unwrapOpt(location.zipcode as any) || '',
      country_code: location.country_code,
      is_default: location.is_default,
    });
    setShowLocationModal(true);
  }

  async function handleSaveLocation() {
    setIsLoading(true);
    try {
      const backend = await getBackend();
      let result;
      if (editingLocation) {
        result = await backend.admin_update_stock_location(editingLocation.id, {
          name: [locationForm.name],
          code: [locationForm.code],
          address1: [locationForm.address1],
          city: [locationForm.city],
          state_name: [locationForm.state_name],
          zipcode: [locationForm.zipcode],
          country_code: [locationForm.country_code],
          active: [],
          is_default: [locationForm.is_default],
        });
      } else {
        result = await backend.admin_create_stock_location({
          name: locationForm.name,
          code: [locationForm.code],
          address1: [locationForm.address1],
          city: [locationForm.city],
          state_name: [locationForm.state_name],
          zipcode: [locationForm.zipcode],
          country_code: [locationForm.country_code],
          phone: [],
          is_default: [locationForm.is_default],
        });
      }

      if ('Ok' in result) {
        setShowLocationModal(false);
        loadLocations();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openAdjustModal(item: StockItem) {
    setAdjustingItem(item);
    setAdjustAmount('');
    setShowAdjustModal(true);
  }

  async function handleAdjustStock() {
    if (!adjustingItem || !selectedLocation) return;
    const amount = BigInt(adjustAmount);
    if (isNaN(Number(amount))) return;

    setIsLoading(true);
    try {
      const backend = await getBackend();
      const result = await backend.admin_adjust_stock({
        stock_item_id: adjustingItem.id,
        quantity: amount,
        reason: ['Admin manual adjustment'],
      });

      if ('Ok' in result) {
        setShowAdjustModal(false);
        loadStockItems(selectedLocation.id);
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteLocation() {
    if (!deletingLocation) return;

    setIsLoading(true);
    setError(null);
    try {
      const backend = await getBackend();
      const result = await backend.admin_delete_stock_location(deletingLocation.id);

      if ('Ok' in result) {
        setDeletingLocation(null);
        if (selectedLocation?.id === deletingLocation.id) {
          setSelectedLocation(null);
        }
        loadLocations();
      } else {
        setError(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {showLowStockOnly ? 'Low Stock Items' : 'Stock Locations'}
          </h1>
          <p className="text-gray-500 mt-1">
            {showLowStockOnly
              ? `${stockItems.length} items with stock below threshold`
              : 'Manage inventory across locations'}
          </p>
        </div>
        {!showLowStockOnly && (
          <button onClick={openAddLocationModal} className="btn-primary">
            + Add Location
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showLowStockOnly ? '' : 'lg:grid-cols-4'} gap-6`}>
        {/* Locations List - hide in low stock mode */}
        {!showLowStockOnly && (
          <div className="lg:col-span-1">
            <div className="card">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold">Locations</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedLocation?.id === location.id ? 'bg-gray-50' : ''
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-gray-500">{location.code}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {location.is_default && (
                          <span className="badge-info text-xs">Default</span>
                        )}
                        {location.active ? (
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                        ) : (
                          <span className="w-2 h-2 bg-gray-300 rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stock Items */}
        <div className={showLowStockOnly ? '' : 'lg:col-span-3'}>
          {(showLowStockOnly || selectedLocation) ? (
            <div className="card">
              {showLowStockOnly ? (
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-semibold">Items Below Stock Threshold</h2>
                  <p className="text-sm text-gray-500">
                    Showing all items with stock count below 10 units
                  </p>
                </div>
              ) : selectedLocation && (
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h2 className="font-semibold">{selectedLocation.name}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedLocation.city}, {selectedLocation.state_name} {selectedLocation.zipcode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditLocationModal(selectedLocation)}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingLocation(selectedLocation)}
                      className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              <table className="w-full">
                <thead className="bg-gray-15 border-b border-gray-100">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Product</th>
                    <th className="text-left p-4 font-medium text-gray-700">SKU</th>
                    <th className="text-center p-4 font-medium text-gray-700">On Hand</th>
                    <th className="text-center p-4 font-medium text-gray-700">Backorderable</th>
                    <th className="text-right p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockItems.map((item) => (
                    <tr key={item.id.toString()} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{item.product_name}</td>
                      <td className="p-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {item.variant_sku}
                        </code>
                      </td>
                      <td className="p-4 text-center">
                        <span className={Number(item.count_on_hand) <= 10 ? 'text-red-500 font-medium' : ''}>
                          {item.count_on_hand.toString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {item.backorderable ? (
                          <span className="badge-success">Yes</span>
                        ) : (
                          <span className="badge-gray">No</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="body-link"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {stockItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {showLowStockOnly
                    ? 'No items are below the stock threshold.'
                    : 'No stock items at this location.'}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              Select a location to view stock items.
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">
                {editingLocation ? 'Edit Location' : 'Add Location'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-100 text-red-500 p-3 rounded text-sm">{error}</div>
              )}
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Warehouse Name"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Code</label>
                <input
                  type="text"
                  className="input"
                  placeholder="MAIN"
                  value={locationForm.code}
                  onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  className="input"
                  placeholder="123 Commerce St"
                  value={locationForm.address1}
                  onChange={(e) => setLocationForm({ ...locationForm, address1: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="San Francisco"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="CA"
                    value={locationForm.state_name}
                    onChange={(e) => setLocationForm({ ...locationForm, state_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ZIP Code</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="94102"
                    value={locationForm.zipcode}
                    onChange={(e) => setLocationForm({ ...locationForm, zipcode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="US"
                    value={locationForm.country_code}
                    onChange={(e) => setLocationForm({ ...locationForm, country_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={locationForm.is_default}
                  onChange={(e) => setLocationForm({ ...locationForm, is_default: e.target.checked })}
                />
                <label htmlFor="is_default" className="text-sm">Default Location</label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                disabled={isLoading}
                onClick={() => setShowLocationModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                disabled={isLoading}
                onClick={handleSaveLocation}
                className="btn-primary"
              >
                {isLoading ? <div className="spinner w-4 h-4" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Adjust Stock</h2>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="font-medium">{adjustingItem.product_name}</p>
                <p className="text-sm text-gray-500">Current: {adjustingItem.count_on_hand.toString()} units</p>
              </div>

              <div>
                <label className="label">Adjustment Amount</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="input"
                  placeholder="Enter +10 or -5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use positive numbers to add, negative to remove
                </p>
              </div>

              {adjustAmount && !isNaN(parseInt(adjustAmount)) && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md">
                  <span className="text-sm">New total: </span>
                  <span className="font-medium">
                    {(adjustingItem.count_on_hand + BigInt(adjustAmount)).toString()} units
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button disabled={isLoading} onClick={() => setShowAdjustModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button disabled={isLoading} onClick={handleAdjustStock} className="btn-primary">
                {isLoading ? <div className="spinner w-4 h-4" /> : 'Adjust'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Confirmation Modal */}
      {deletingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-red-600">Delete Location</h2>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-100 text-red-600 p-3 rounded text-sm mb-4">{error}</div>
              )}
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{deletingLocation.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone. You can only delete a location if it has no stock items and is not the default location.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                disabled={isLoading}
                onClick={() => { setDeletingLocation(null); setError(null); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                disabled={isLoading}
                onClick={handleDeleteLocation}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                {isLoading ? <div className="spinner w-4 h-4" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
