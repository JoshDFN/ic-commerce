import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBackend, formatPrice } from '../../lib/backend';

interface OptionType {
    id: bigint;
    name: string;
    presentation: string;
}

interface Product {
    id: bigint;
    name: string;
    price: bigint;
    slug: string;
    variants: Variant[];
}

interface Variant {
    id: bigint;
    sku: string;
    stock: bigint;
    price: bigint;
    is_master: boolean;
    option_values: { id: bigint, name: string, presentation: string }[];
}

export default function PowerProductVariants() {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [optionTypes, setOptionTypes] = useState<OptionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Variant Form
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('0');
    const [stock, setStock] = useState('10');
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({}); // optionType.name -> optionValue

    // New Option Type Form
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPres, setNewOptionPres] = useState('');
    const [isCreatingOption, setIsCreatingOption] = useState(false);

    // Auto-generate SKU
    useEffect(() => {
        if (!product) return;
        const master = product.variants.find(v => v.is_master);
        if (!master) return;

        const parts = [master.sku];
        // Sort keys to be deterministic
        Object.keys(selectedOptions).sort().forEach(key => {
            const val = selectedOptions[key];
            if (val) parts.push(val.toUpperCase().replace(/\s+/g, '-'));
        });

        if (parts.length > 1) {
            setSku(parts.join('-'));
        }
    }, [selectedOptions, product]);

    useEffect(() => {
        loadData();
    }, [id, refreshKey]);

    async function loadData() {
        if (!id) return;
        setLoading(true);
        try {
            const backend = await getBackend();
            // Load Product
            const pRes = await backend.get_products({ q: [], taxon_id: [], sort: [], page: [], per_page: [BigInt(100)], in_stock: [] });
            if ('Ok' in pRes) {
                const found = pRes.Ok.products.find((p: any) => p.id.toString() === id);
                if (found) {
                    // Need full detail for variants
                    const dRes = await backend.get_product(found.slug);
                    if ('Ok' in dRes) {
                        setProduct(dRes.Ok);
                    }
                }
            }

            // Load Option Types
            const otRes = await backend.get_option_types();
            if ('Ok' in otRes) {
                // Map abstract OptionValueRef to OptionType
                setOptionTypes(otRes.Ok.map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    presentation: o.presentation
                })));
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateOptionType(e: React.FormEvent) {
        e.preventDefault();
        try {
            const backend = await getBackend();
            await backend.create_option_type({
                name: newOptionName,
                presentation: newOptionPres
            });
            setIsCreatingOption(false);
            setNewOptionName('');
            setNewOptionPres('');
            setRefreshKey(k => k + 1);
        } catch (e: any) {
            alert(e.message);
        }
    }

    async function handleCreateVariant(e: React.FormEvent) {
        e.preventDefault();
        if (!product) return;
        try {
            const backend = await getBackend();
            const optionValueIds: bigint[] = [];

            for (const [typeName, valName] of Object.entries(selectedOptions)) {
                if (!valName) continue;
                // Find type ID
                const type = optionTypes.find(t => t.name === typeName);
                if (!type) continue;

                // Create Value
                const ovRes = await backend.create_option_value({
                    option_type_id: type.id,
                    name: valName,
                    presentation: valName // simple mapping
                });

                if ('Ok' in ovRes) {
                    optionValueIds.push(ovRes.Ok);
                }
            }

            const res = await backend.create_variant({
                product_id: product.id,
                sku: sku,
                price: BigInt(parseFloat(price) * 100),
                stock: BigInt(stock),
                option_value_ids: optionValueIds
            });

            if ('Ok' in res) {
                setRefreshKey(k => k + 1);
                setSku('');
            } else {
                alert(res.Err);
            }

        } catch (e: any) {
            alert(e.message);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;
    if (!product) return <div className="p-8">Product not found</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Link to="/admin/products" className="text-gray-500 hover:text-black mb-2 inline-block">&larr; Back to Products</Link>
                    <h1 className="text-2xl font-bold">Variants: {product.name}</h1>
                    {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: List of Variants */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left p-3">SKU</th>
                                    <th className="text-left p-3">Options</th>
                                    <th className="text-right p-3">Price</th>
                                    <th className="text-right p-3">Stock</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {product.variants.filter(v => !v.is_master).map(v => (
                                    <tr key={v.id.toString()}>
                                        <td className="p-3 font-mono text-sm">{v.sku}</td>
                                        <td className="p-3">
                                            {v.option_values.map(ov => (
                                                <span key={ov.id.toString()} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-1">
                                                    {ov.presentation}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="p-3 text-right">{formatPrice(v.price)}</td>
                                        <td className="p-3 text-right">{v.stock.toString()}</td>
                                        <td className="p-3 text-right">
                                            {/* Edit/Delete */}
                                        </td>
                                    </tr>
                                ))}
                                {product.variants.filter(v => !v.is_master).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No variants yet. Create one on the right.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="space-y-6">

                    {/* 1. Ensure Option Types exist */}
                    <div className="card p-6">
                        <h3 className="font-bold mb-4">1. Option Types</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {optionTypes.map(ot => (
                                <span key={ot.id.toString()} className="badge-info">
                                    {ot.presentation}
                                </span>
                            ))}
                            {optionTypes.length === 0 && <span className="text-gray-400 text-sm">None defined</span>}
                        </div>

                        {isCreatingOption ? (
                            <form onSubmit={handleCreateOptionType} className="space-y-3">
                                <input className="input" placeholder="Name (e.g. size)" value={newOptionName} onChange={e => setNewOptionName(e.target.value)} />
                                <input className="input" placeholder="Label (e.g. Size)" value={newOptionPres} onChange={e => setNewOptionPres(e.target.value)} />
                                <div className="flex gap-2">
                                    <button type="submit" className="btn-primary flex-1">Save</button>
                                    <button type="button" onClick={() => setIsCreatingOption(false)} className="btn-secondary">Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setIsCreatingOption(true)} className="text-sm text-blue-600 font-bold hover:underline">
                                + New Option Type
                            </button>
                        )}
                    </div>

                    {/* 2. Create Variant */}
                    <div className="card p-6">
                        <h3 className="font-bold mb-4">2. Add Variant</h3>
                        <form onSubmit={handleCreateVariant} className="space-y-4">
                            <div>
                                <label className="label">SKU</label>
                                <input className="input" value={sku} onChange={e => setSku(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Price ($)</label>
                                    <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="label">Stock</label>
                                    <input className="input" type="number" value={stock} onChange={e => setStock(e.target.value)} required />
                                </div>
                            </div>

                            {optionTypes.map(ot => (
                                <div key={ot.id.toString()}>
                                    <label className="label">{ot.presentation}</label>
                                    <input
                                        className="input"
                                        placeholder={`Value for ${ot.presentation}`}
                                        value={selectedOptions[ot.name] || ''}
                                        onChange={e => setSelectedOptions({ ...selectedOptions, [ot.name]: e.target.value })}
                                    />
                                </div>
                            ))}

                            <button type="submit" className="btn-primary w-full py-3">
                                Generate Variant
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
