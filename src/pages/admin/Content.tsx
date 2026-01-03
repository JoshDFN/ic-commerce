import { useState, useEffect } from 'react';
import { useSettings, StoreSetting } from '../../hooks/useSettings';

export default function AdminContent() {
    const { settings, loading, updateSettings } = useSettings();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handeSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updates: StoreSetting[] = Object.entries(formData).map(([key, value]) => ({ key, value }));
            await updateSettings(updates);
            alert('Content updated successfully');
        } catch (err: any) {
            alert('Failed to update content: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading content...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Storefront Content</h1>

            <form onSubmit={handeSave} className="space-y-8 max-w-4xl">

                {/* Branding */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">Branding</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Store Name</label>
                            <input className="input" value={formData['store_name'] || ''} onChange={e => handleChange('store_name', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Logo Main Text</label>
                            <input className="input" placeholder="CANISTER" value={formData['logo_text_primary'] ?? ''} onChange={e => handleChange('logo_text_primary', e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Large text shown in header. Default: CANISTER</p>
                        </div>
                        <div>
                            <label className="label">Logo Subtitle</label>
                            <input className="input" placeholder="SHOP" value={formData['logo_text_secondary'] ?? ''} onChange={e => handleChange('logo_text_secondary', e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Small text below logo. Default: SHOP</p>
                        </div>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">Hero Section</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="label">Hero Title</label>
                            <input className="input" value={formData['hero_title'] || ''} onChange={e => handleChange('hero_title', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Hero Subtitle</label>
                            <textarea className="input h-24" value={formData['hero_subtitle'] || ''} onChange={e => handleChange('hero_subtitle', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Hero Button Text</label>
                            <input className="input" placeholder="Shop Collection" value={formData['hero_button_text'] ?? ''} onChange={e => handleChange('hero_button_text', e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Default: Shop Collection</p>
                        </div>
                        <div>
                            <label className="label">Hero Background Image URL (Optional)</label>
                            <input className="input" placeholder="https://..." value={formData['hero_bg_image'] || ''} onChange={e => handleChange('hero_bg_image', e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">If set, this image will replace the default background.</p>
                        </div>
                    </div>
                </div>

                {/* Announcement Bar */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">Announcement Bar</h2>
                    <div>
                        <label className="label">Announcement Text</label>
                        <input className="input" placeholder="Free Shipping on all orders over $100" value={formData['announcement_text'] ?? ''} onChange={e => handleChange('announcement_text', e.target.value)} />
                        <p className="text-xs text-gray-500 mt-1">Appears at the very top of the page. Leave empty for default.</p>
                    </div>
                </div>

                {/* Pages */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">Pages</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="label">About Us Content</label>
                            <textarea className="input h-32" value={formData['about_content'] || ''} onChange={e => handleChange('about_content', e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Displayed at /about</p>
                        </div>
                        <div>
                            <label className="label">Support Page Content</label>
                            <textarea className="input h-32" value={formData['support_content'] || ''} onChange={e => handleChange('support_content', e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Displayed at /contact</p>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">Features Section</h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4">
                                <label className="label">Feature 1 Title</label>
                                <input className="input" value={formData['feature_1_title'] || ''} onChange={e => handleChange('feature_1_title', e.target.value)} />
                            </div>
                            <div className="col-span-8">
                                <label className="label">Feature 1 Text</label>
                                <input className="input" value={formData['feature_1_text'] || ''} onChange={e => handleChange('feature_1_text', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4">
                                <label className="label">Feature 2 Title</label>
                                <input className="input" value={formData['feature_2_title'] || ''} onChange={e => handleChange('feature_2_title', e.target.value)} />
                            </div>
                            <div className="col-span-8">
                                <label className="label">Feature 2 Text</label>
                                <input className="input" value={formData['feature_2_text'] || ''} onChange={e => handleChange('feature_2_text', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4">
                                <label className="label">Feature 3 Title</label>
                                <input className="input" value={formData['feature_3_title'] || ''} onChange={e => handleChange('feature_3_title', e.target.value)} />
                            </div>
                            <div className="col-span-8">
                                <label className="label">Feature 3 Text</label>
                                <input className="input" value={formData['feature_3_text'] || ''} onChange={e => handleChange('feature_3_text', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="btn-primary px-8" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

            </form>
        </div>
    );
}
