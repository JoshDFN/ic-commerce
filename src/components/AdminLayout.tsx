import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

export default function AdminLayout() {
  const { isLoggedIn, isLoading, role } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/admin/settings')
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!isLoggedIn || role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  const mainNavItems = [
    { path: '/admin', label: 'Dashboard', exact: true },
    { path: '/admin/revenue', label: 'Revenue' },
    { path: '/admin/orders', label: 'Orders' },
    { path: '/admin/products', label: 'Products' },
    { path: '/admin/customers', label: 'Customers' },
    { path: '/admin/taxonomies', label: 'Categories' },
    { path: '/admin/stock-locations', label: 'Stock' },
  ];

  const settingsNavItems = [
    { path: '/admin/settings', label: 'General', exact: true },
    { path: '/admin/settings/content', label: 'Content (CMS)' },
    { path: '/admin/settings/email', label: 'Email Settings' },
    { path: '/admin/settings/email-templates', label: 'Email Templates' },
    { path: '/admin/settings/payment-methods', label: 'Payment Methods' },
    { path: '/admin/settings/shipping-methods', label: 'Shipping Methods' },
    { path: '/admin/settings/zones', label: 'Zones' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-sand font-sans">
      {/* Sidebar - Solidus V4 style (Light Sidebar) */}
      <aside className="fixed inset-y-0 left-0 bg-gray-15 w-64 border-r border-gray-100 z-30 flex flex-col">
        {/* Brand */}
        <div className="p-4 bg-gray-15">
          <Link to="/admin" className="flex items-center space-x-2 w-full py-3 px-2 mb-4">
            {/* Use logo text fields if set, otherwise fall back to store_name */}
            <span className="text-black font-bold text-xl tracking-tight uppercase">
              {settings ? (
                settings['logo_text_primary']
                  ? `${settings['logo_text_primary']}${settings['logo_text_secondary'] ? ' ' + settings['logo_text_secondary'] : ''}`
                  : (settings['store_name'] || 'CANISTER SHOP')
              ) : 'LOADING...'}
            </span>
          </Link>

          {/* Store Info Card */}
          <a href="/" target="_blank" className="flex mb-4 px-2 py-1.5 border border-gray-100 rounded-sm shadow-sm bg-white hover:bg-gray-50 transition-colors group">
            <div className="flex-grow flex flex-col gap-0.5">
              <p className="font-semibold text-sm text-black group-hover:text-blue">
                {settings ? (settings['store_name'] || settings['logo_text_primary'] || 'Canister Shop') : 'Loading...'} Admin
              </p>
              <p className="font-normal text-xs text-gray-500">View Storefront</p>
            </div>
          </a>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto">
          {/* Navigation Items */}
          <ul className="flex flex-col gap-0.5">
            {mainNavItems.map((item) => {
              const active = isActive(item.path, item.exact);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-2 py-1.5 text-sm font-medium rounded transition-colors ${active
                      ? 'bg-gray-100 text-black'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                      }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Settings Group */}
          <div className="mt-8">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 rounded transition-colors"
            >
              <span>Settings</span>
              <svg className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {settingsOpen && (
              <ul className="mt-1 ml-4 border-l border-gray-200 pl-2 space-y-0.5">
                {settingsNavItems.map((item) => {
                  const active = isActive(item.path, item.exact);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`block px-2 py-1.5 text-sm transition-colors rounded ${active ? 'text-black font-medium' : 'text-gray-500 hover:text-black'
                          }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>

        {/* User / Footer */}
        <div className="p-4 mt-auto">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-solidus-red text-white flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Administrator</span>
              <span className="text-[10px] text-gray-400 font-mono">Logged in via II</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Header - Minimal, mostly forbreadcrumbs or actions */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <h1 className="text-xl font-bold text-black tracking-tight">
            {/* Simple dynamic title logic */}
            {location.pathname === '/admin' ? 'Dashboard' :
              location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
