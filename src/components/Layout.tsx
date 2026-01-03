import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useSettings } from '../hooks/useSettings';
import { getBackend } from '../lib/backend';

interface Taxon {
  id: bigint;
  name: string;
}

interface Taxonomy {
  id: bigint;
  name: string;
  taxons: Taxon[];
}

export default function Layout() {
  const { isLoggedIn, isLoading, role, login, logout } = useAuth();
  const { cart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setSubscribeStatus('loading');
    try {
      const backend = await getBackend();
      const result = await backend.subscribe_newsletter(newsletterEmail);
      if ('Ok' in result) {
        setSubscribeStatus('success');
        setNewsletterEmail('');
      } else {
        console.error('Newsletter Error:', result.Err);
        setSubscribeStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSubscribeStatus('error');
    }
  };

  const itemCount = cart ? Number(cart.item_count) : 0;

  useEffect(() => {
    async function loadTaxonomies() {
      try {
        const backend = await getBackend();
        const result = await backend.get_taxonomies();
        if ('Ok' in result) {
          setTaxonomies(result.Ok);
        }
      } catch (e) {
        console.error('Failed to load taxonomies:', e);
      }
    }
    loadTaxonomies();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sand">
      {/* Top Banner - Solidus Demo Style */}
      <div className="bg-black text-white py-2.5 text-center text-[11px] font-bold tracking-widest uppercase">
        {settings['announcement_text'] || 'Free Shipping on all orders over $100'}
      </div>

      {/* Header - Solidus Demo Style (Centered Logo, Split Nav) */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-12 items-center h-[88px]">

            {/* Left Nav (Search + Taxonomy) */}
            <div className="col-span-4 flex items-center space-x-6">
              <button
                onClick={() => navigate('/products')}
                className="hidden md:flex items-center text-sm font-bold uppercase tracking-widest text-black hover:text-solidus-red transition-colors"
              >
                Shop
              </button>

              <div className="hidden md:block relative w-64">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent border-b border-gray-300 focus:border-solidus-red py-2 text-sm text-black placeholder-gray-400 focus:outline-none transition-colors"
                  />
                  <button type="submit" className="absolute right-0 top-2 text-black hover:text-solidus-red">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </button>
                </form>
              </div>
            </div>

            {/* Center Logo */}
            <div className="col-span-4 flex justify-center">
              <Link to="/" className="flex flex-col items-center group">
                <span className="text-3xl font-black text-black tracking-tighter group-hover:text-solidus-red transition-colors">
                  {settings['logo_text_primary'] || 'CANISTER'}
                </span>
                <span className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mt-1">
                  {settings['logo_text_secondary'] || 'SHOP'}
                </span>
              </Link>
            </div>

            {/* Right Nav (Account + Cart) */}
            <div className="col-span-4 flex justify-end items-center space-x-8">
              <div className="hidden sm:flex items-center space-x-6">
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-solidus-red animate-spin" />
                ) : isLoggedIn ? (
                  <>
                    <Link to="/account" className="text-sm font-bold uppercase tracking-widest text-black hover:text-solidus-red transition-colors">Account</Link>
                    {role === 'Admin' && (
                      <Link to="/admin" className="text-xs font-bold uppercase tracking-widest text-solidus-red border border-solidus-red px-3 py-1 rounded-full hover:bg-solidus-red hover:text-white transition-colors">Admin</Link>
                    )}
                    <button onClick={logout} className="text-sm font-medium text-gray-400 hover:text-black">Log Out</button>
                  </>
                ) : (
                  <button onClick={login} className="text-sm font-bold uppercase tracking-widest text-black hover:text-solidus-red transition-colors">Login</button>
                )}
              </div>

              <Link to="/cart" className="relative group flex items-center">
                <span className="hidden lg:block text-sm font-bold uppercase tracking-widest text-black hover:text-solidus-red transition-colors mr-2">Cart</span>
                <div className="relative">
                  <svg className="w-6 h-6 text-black group-hover:text-solidus-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-solidus-red text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer - Premium Solidus Style */}
      <footer className="bg-black text-white pt-20 pb-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-gray-800 pb-16">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="flex items-center mb-6">
                <span className="text-2xl font-bold text-solidus-red tracking-tight">
                  {settings['logo_text_primary'] || 'CANISTER'}
                </span>
                <span className="text-2xl font-bold text-white tracking-tight ml-0.5">
                  {settings['logo_text_secondary'] || 'SHOP'}
                </span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed">
                The future of e-commerce is here. Built on the Internet Computer for maximum security, speed, and decentralization.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">ShopBy</h4>
              <ul className="space-y-4">
                <li><Link to="/products" className="text-sm text-gray-300 hover:text-solidus-red transition-colors">All Collections</Link></li>
                {taxonomies.slice(0, 3).map(t => (
                  <li key={t.id.toString()}><Link to={`/products?category=${t.id}`} className="text-sm text-gray-300 hover:text-solidus-red transition-colors">{t.name}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">Company</h4>
              <ul className="space-y-4">
                <li><Link to="/about" className="text-sm text-gray-300 hover:text-solidus-red transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="text-sm text-gray-300 hover:text-solidus-red transition-colors">Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">Stay Connected</h4>
              <p className="text-sm text-gray-400 mb-4">Join our community and get updates on new drops.</p>
              <form onSubmit={handleSubscribe} className="flex">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={subscribeStatus === 'success' ? 'Subscribed!' : 'Email'}
                  disabled={subscribeStatus === 'success' || subscribeStatus === 'loading'}
                  className="bg-gray-800 border-none rounded-l-md px-4 py-2 text-sm w-full focus:ring-1 focus:ring-solidus-red outline-none text-white placeholder-gray-500 disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === 'success' || subscribeStatus === 'loading'}
                  className={`bg-solidus-red hover:bg-red-600 px-4 py-2 rounded-r-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {subscribeStatus === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : subscribeStatus === 'success' ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
              </form>
              {subscribeStatus === 'error' && (
                <p className="text-xs text-red-500 mt-2">Failed to subscribe. Please try again.</p>
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-500 text-xs">
              © 2026 {settings['store_name'] ? settings['store_name'].toUpperCase() : 'CANISTER SHOP'}. ALL RIGHTS RESERVED.
            </div>
            <div className="flex items-center space-x-6 text-gray-500">
              <span className="text-xs hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="text-xs hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
