import { useState, useEffect } from 'react';
import { getBackend } from '../../lib/backend';

interface EmailTemplate {
    id: bigint;
    event_type: string;
    name: string;
    subject: string;
    body_html: string;
    body_text: string;
    active: boolean;
}

const EVENT_LABELS: Record<string, string> = {
    'order_confirmation': 'Order Confirmation',
    'order_shipped': 'Order Shipped',
    'order_canceled': 'Order Canceled',
};

const VARIABLE_HELP = [
    { var: '{{store_name}}', desc: 'Your store name' },
    { var: '{{customer_name}}', desc: 'Customer full name' },
    { var: '{{order_number}}', desc: 'Order number (e.g., R123ABC)' },
    { var: '{{total}}', desc: 'Order total with currency' },
    { var: '{{items}}', desc: 'List of order items (HTML only)' },
    { var: '{{items_text}}', desc: 'List of order items (plain text)' },
    { var: '{{shipping_address}}', desc: 'Shipping address' },
    { var: '{{tracking_number}}', desc: 'Shipment tracking number' },
    { var: '{{tracking_url}}', desc: 'Tracking URL' },
];

export default function AdminEmailTemplates() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [testEmail, setTestEmail] = useState('');
    const [activeTab, setActiveTab] = useState<'html' | 'text' | 'preview'>('html');

    // Form state for editing
    const [editSubject, setEditSubject] = useState('');
    const [editHtml, setEditHtml] = useState('');
    const [editText, setEditText] = useState('');
    const [editActive, setEditActive] = useState(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            setEditSubject(selectedTemplate.subject);
            setEditHtml(selectedTemplate.body_html);
            setEditText(selectedTemplate.body_text);
            setEditActive(selectedTemplate.active);
            setActiveTab('html');
        }
    }, [selectedTemplate]);

    async function loadTemplates() {
        try {
            const backend = await getBackend();
            const result = await backend.get_email_templates();
            if ('Ok' in result) {
                setTemplates(result.Ok);
                if (result.Ok.length > 0 && !selectedTemplate) {
                    setSelectedTemplate(result.Ok[0]);
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

    async function handleSave() {
        if (!selectedTemplate) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const backend = await getBackend();
            const result = await backend.update_email_template(selectedTemplate.event_type, {
                subject: [editSubject],
                body_html: [editHtml],
                body_text: [editText],
                active: [editActive],
            });

            if ('Err' in result) {
                setError(result.Err);
            } else {
                setSuccess('Template saved successfully');
                // Update local state
                setTemplates(prev => prev.map(t =>
                    t.event_type === selectedTemplate.event_type
                        ? { ...t, subject: editSubject, body_html: editHtml, body_text: editText, active: editActive }
                        : t
                ));
                setSelectedTemplate(prev => prev ? { ...prev, subject: editSubject, body_html: editHtml, body_text: editText, active: editActive } : null);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSendTest() {
        if (!selectedTemplate || !testEmail) return;
        setIsSendingTest(true);
        setError(null);
        setSuccess(null);

        try {
            const backend = await getBackend();
            const result = await backend.send_test_email(selectedTemplate.event_type, testEmail);

            if ('Ok' in result) {
                setSuccess(result.Ok);
            } else {
                setError(result.Err);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSendingTest(false);
        }
    }

    // Generate preview HTML with test data
    const previewHtml = editHtml
        .replace(/\{\{store_name\}\}/g, 'Canister Shop')
        .replace(/\{\{customer_name\}\}/g, 'John Doe')
        .replace(/\{\{order_number\}\}/g, 'R123ABC456')
        .replace(/\{\{total\}\}/g, '$149.99')
        .replace(/\{\{shipping_address\}\}/g, '123 Main St<br>New York, NY 10001')
        .replace(/\{\{tracking_number\}\}/g, '1Z999AA10123456784')
        .replace(/\{\{tracking_url\}\}/g, '#')
        .replace(/\{\{#items\}\}[\s\S]*?\{\{\/items\}\}/g, `
            <div class="item"><span>1x Premium Widget</span><span>$99.99</span></div>
            <div class="item"><span>2x Basic Gadget</span><span>$50.00</span></div>
        `);

    if (isLoading) return <div className="p-8">Loading templates...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Email Templates</h1>
            </div>

            {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6">
                    {success}
                </div>
            )}

            <div className="flex gap-6">
                {/* Template List */}
                <div className="w-64 shrink-0">
                    <div className="card p-4">
                        <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wider">Templates</h3>
                        <div className="space-y-2">
                            {templates.map(template => (
                                <button
                                    key={template.event_type}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                        selectedTemplate?.event_type === template.event_type
                                            ? 'bg-black text-white'
                                            : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="font-medium">{template.name}</div>
                                    <div className={`text-xs ${selectedTemplate?.event_type === template.event_type ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {template.active ? 'Active' : 'Disabled'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Variable Reference */}
                    <div className="card p-4 mt-4">
                        <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wider">Variables</h3>
                        <div className="space-y-2 text-sm">
                            {VARIABLE_HELP.map(v => (
                                <div key={v.var}>
                                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{v.var}</code>
                                    <div className="text-gray-500 text-xs mt-0.5">{v.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Editor */}
                {selectedTemplate && (
                    <div className="flex-1 min-w-0">
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                                    <p className="text-gray-500 text-sm">{EVENT_LABELS[selectedTemplate.event_type] || selectedTemplate.event_type}</p>
                                </div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={editActive}
                                        onChange={(e) => setEditActive(e.target.checked)}
                                        className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm">Active</span>
                                </label>
                            </div>

                            {/* Subject */}
                            <div className="mb-6">
                                <label className="label">Email Subject</label>
                                <input
                                    type="text"
                                    className="input font-mono"
                                    value={editSubject}
                                    onChange={(e) => setEditSubject(e.target.value)}
                                    placeholder="Order Confirmed - {{order_number}}"
                                />
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 mb-4 border-b">
                                <button
                                    onClick={() => setActiveTab('html')}
                                    className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                                        activeTab === 'html' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'
                                    }`}
                                >
                                    HTML Body
                                </button>
                                <button
                                    onClick={() => setActiveTab('text')}
                                    className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                                        activeTab === 'text' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'
                                    }`}
                                >
                                    Plain Text
                                </button>
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                                        activeTab === 'preview' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'
                                    }`}
                                >
                                    Preview
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'html' && (
                                <textarea
                                    className="input font-mono text-sm h-96"
                                    value={editHtml}
                                    onChange={(e) => setEditHtml(e.target.value)}
                                    placeholder="<!DOCTYPE html>..."
                                />
                            )}

                            {activeTab === 'text' && (
                                <textarea
                                    className="input font-mono text-sm h-96"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    placeholder="Plain text version of email..."
                                />
                            )}

                            {activeTab === 'preview' && (
                                <div className="border rounded-lg bg-white h-96 overflow-auto">
                                    <iframe
                                        srcDoc={previewHtml}
                                        className="w-full h-full"
                                        title="Email Preview"
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-6 pt-6 border-t">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="email"
                                        className="input w-64"
                                        placeholder="test@example.com"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSendTest}
                                        disabled={isSendingTest || !testEmail}
                                        className="btn-secondary whitespace-nowrap disabled:opacity-50"
                                    >
                                        {isSendingTest ? 'Sending...' : 'Send Test'}
                                    </button>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="btn-primary px-8"
                                >
                                    {isSaving ? 'Saving...' : 'Save Template'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
