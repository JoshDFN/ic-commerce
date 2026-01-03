import { Link } from 'react-router-dom';

const settingsSections = [
  {
    title: 'Payment Methods',
    description: 'Configure payment gateways including Stripe, PayPal, and more.',
    path: '/admin/settings/payment-methods',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    title: 'Shipping Methods',
    description: 'Set up shipping rates, carriers, and delivery options.',
    path: '/admin/settings/shipping-methods',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    title: 'Zones',
    description: 'Define geographic zones for shipping and tax calculations.',
    path: '/admin/settings/zones',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Email Settings',
    description: 'Configure SendGrid API and sender email address.',
    path: '/admin/settings/email',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    title: 'Email Templates',
    description: 'Customize order confirmation, shipping, and other email templates.',
    path: '/admin/settings/email-templates',
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  },
  {
    title: 'Content',
    description: 'Edit homepage hero, features, and other site content.',
    path: '/admin/settings/content',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
];

export default function AdminSettings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your store configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className="card p-6 hover:shadow-base transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-lg">{section.title}</h2>
                <p className="text-gray-500 text-sm mt-1">{section.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Store Info */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Store Information</h2>
        <div className="card p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Store Name</label>
              <input type="text" className="input" defaultValue="Canister Shop" />
            </div>
            <div>
              <label className="label">Store URL</label>
              <input type="text" className="input" defaultValue="https://your-store.ic0.app" disabled />
            </div>
            <div>
              <label className="label">Default Currency</label>
              <select className="input">
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div>
              <label className="label">Default Country</label>
              <select className="input">
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
