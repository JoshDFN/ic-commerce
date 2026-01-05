import { useState, useEffect } from 'react';
import { getBackend } from '../../lib/backend';
import { useToast } from '../../components/Toast';

interface EmailSettings {
    provider: string;
    api_key: string;
    sender_email: string;
    active: boolean;
}

export default function AdminEmailSettings() {
    const [settings, setSettings] = useState<EmailSettings>({
        provider: 'sendgrid',
        api_key: '',
        sender_email: '',
        active: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const backend = await getBackend();
            const result = await backend.get_email_settings();
            if ('Ok' in result) {
                setSettings(result.Ok);
            }
            // If error (e.g. not initialized), keep defaults
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to load settings';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const backend = await getBackend();
            const result = await backend.update_email_settings(settings);

            if ('Err' in result) {
                setError(result.Err);
                return;
            }

            showToast('Email settings updated successfully', 'success');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) return <div className="p-8">Loading settings...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Email Settings</h1>

            {error && (
                <div className="bg-red-100 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div className="card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Provider Configuration</h2>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="active"
                                checked={settings.active}
                                onChange={(e) => setSettings({ ...settings, active: e.target.checked })}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                                Enable Email Notifications
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="label">Provider</label>
                        <select
                            className="input"
                            value={settings.provider}
                            onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                        >
                            <option value="sendgrid">SendGrid</option>
                            {/* Future: Mailgun, Postmark */}
                        </select>
                    </div>

                    <div>
                        <label className="label">API Key</label>
                        <input
                            type="password"
                            className="input font-mono"
                            value={settings.api_key}
                            onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                            placeholder="SG.xxxxxxxx"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Your SendGrid API Key. Permissions needed: Mail Send.
                        </p>
                    </div>

                    <div>
                        <label className="label">Sender Email</label>
                        <input
                            type="email"
                            className="input"
                            value={settings.sender_email}
                            onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                            placeholder="noreply@yourstore.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Must be a verified sender in your SendGrid account.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="btn-primary px-8" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
