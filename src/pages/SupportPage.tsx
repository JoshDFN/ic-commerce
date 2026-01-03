import { useSettings } from '../hooks/useSettings';

export default function SupportPage() {
    const { settings } = useSettings();

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
            <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl font-black text-black tracking-tighter mb-8 uppercase">Customer Support</h1>

                <div className="bg-gray-50 p-8 rounded-lg border border-gray-100 mb-12">
                    <h3 className="text-xl font-bold mb-4">Need Help?</h3>
                    <p className="text-gray-600 mb-4">
                        Our support team is available 24/7.
                    </p>
                    <a href={`mailto:${settings['support_email'] || 'support@example.com'}`} className="text-solidus-red font-bold text-lg hover:underline">
                        {settings['support_email'] || 'support@example.com'}
                    </a>
                </div>

                <div className="prose prose-lg mx-auto text-left">
                    <h3 className="text-center font-bold uppercase tracking-widest text-sm text-gray-400 mb-8">FAQ</h3>
                    <p className="whitespace-pre-line text-gray-600">
                        {settings['support_content'] || 'Q: How do I track my order?\nA: You can view your order status in your Account page.\n\nQ: Do you ship internationally?\nA: Yes, we ship to most countries supported by our decentralized logistics network.\n\n(Edit this text in Admin > Settings > Content)'}
                    </p>
                </div>
            </div>
        </div>
    );
}
