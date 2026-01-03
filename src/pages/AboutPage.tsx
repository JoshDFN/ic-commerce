import { useSettings } from '../hooks/useSettings';

export default function AboutPage() {
    const { settings } = useSettings();

    return (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
            <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl font-black text-black tracking-tighter mb-8 uppercase">About Us</h1>

                <div className="prose prose-lg mx-auto text-gray-600">
                    <p className="whitespace-pre-line text-lg leading-relaxed">
                        {settings['about_content'] || 'Welcome to the future of commerce.\n\nBuilt on the Internet Computer, we provide a decentralized shopping experience that is fast, secure, and open.\n\n(Edit this text in Admin > Settings > Content)'}
                    </p>
                </div>
            </div>
        </div>
    );
}
