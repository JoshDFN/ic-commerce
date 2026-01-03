import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBackend } from '../lib/backend';
import { useSettings } from '../hooks/useSettings';
import ProductCard from '../components/ProductCard';

interface Product {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  price: bigint;
  stock: bigint;
  image_url: string | null;
  available: boolean;
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    async function loadProducts() {
      try {
        const backend = await getBackend();
        const result = await backend.get_products({
          per_page: [BigInt(6)],
          page: [],
          q: [],
          taxon_id: [],
          sort: [],
          in_stock: [],
        });

        if ('Ok' in result) {
          setFeaturedProducts(result.Ok.products);
        } else {
          setError(result.Err);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  const hasHeroImage = !!settings['hero_bg_image'];

  return (
    <div>
      {/* Hero Section - Solidus Demo Style (Clean, Bold, Centered) */}
      <section
        className={`relative overflow-hidden ${hasHeroImage ? 'bg-cover bg-center' : 'bg-sand'}`}
        style={hasHeroImage ? { backgroundImage: `url(${settings['hero_bg_image']})` } : {}}
      >
        {hasHeroImage && <div className="absolute inset-0 bg-black/40 z-0"></div>}

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-32 lg:py-48 relative z-10 text-center">

          <h1 className={`text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9] uppercase ${hasHeroImage ? 'text-white' : 'text-black'}`} style={{ whiteSpace: 'pre-line' }}>
            {settings['hero_title'] || 'SHOP THE\nFUTURE'}
          </h1>

          <p className={`text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed ${hasHeroImage ? 'text-gray-100' : 'text-gray-600'}`}>
            {settings['hero_subtitle'] || 'Premium products. Instant checkout. Powered by blockchain technology that just works.'}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/products" className="inline-flex items-center justify-center px-10 py-5 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-solidus-red transition-colors duration-300">
              {settings['hero_button_text'] || 'Shop Collection'}
            </Link>
            <Link to="/about" className="inline-flex items-center justify-center px-10 py-5 bg-white border border-gray-200 text-black font-bold uppercase tracking-widest text-sm hover:border-black transition-colors duration-300">
              Read Manifest
            </Link>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-[0.03] pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </svg>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <span className="text-solidus-red font-bold tracking-widest uppercase text-sm mb-2 block">New Arrivals</span>
              <h2 className="text-4xl font-black text-black tracking-tight">Latest Drops</h2>
            </div>
            <Link to="/products" className="group inline-flex items-center text-sm font-bold uppercase tracking-widest text-black hover:text-solidus-red transition-colors">
              View All Products
              <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <div className="w-12 h-12 border-4 border-gray-100 border-t-solidus-red rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-24 text-red-600 bg-red-50 rounded-lg">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id.toString()}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  description={product.description}
                  price={product.price}
                  stock={product.stock}
                  imageUrl={product.image_url}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Brand Values / Footer Pre-amble */}
      <section className="py-24 bg-black text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-4">{settings['feature_1_title'] || 'Secure'}</h3>
              <p className="text-gray-400 leading-relaxed">{settings['feature_1_text'] || 'End-to-end encryption and decentralized identity verification powered by Internet Identity.'}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-4">{settings['feature_2_title'] || 'Fast'}</h3>
              <p className="text-gray-400 leading-relaxed">{settings['feature_2_text'] || 'Transactions finalized in seconds. No gas fees for users. A seamless shopping experience.'}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-4">{settings['feature_3_title'] || 'Open'}</h3>
              <p className="text-gray-400 leading-relaxed">{settings['feature_3_text'] || 'Built on open standards. Auditable code. A commerce platform owned by the community.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
