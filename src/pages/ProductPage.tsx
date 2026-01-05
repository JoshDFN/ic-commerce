import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBackend, formatPrice } from '../lib/backend';
import { useCart } from '../hooks/useCart';

interface Variant {
  id: bigint;
  sku: string;
  is_master: boolean;
  price: bigint;
  stock: bigint;
  backorderable: boolean;
  option_values: {
    id: bigint;
    name: string;
    presentation: string;
    option_type_name: string;
  }[];
}

interface ProductImage {
  id: bigint;
  url: string;
  alt: string | null;
}

interface Product {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  price: bigint;
  variants: Variant[];
  images: ProductImage[];
  taxons: { id: bigint; name: string; permalink: string | null }[];
  properties: { name: string; presentation: string; value: string | null }[];
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;

      try {
        const backend = await getBackend();
        const result = await backend.get_product(slug);

        if ('Ok' in result) {
          const prod = result.Ok;
          setProduct(prod);
          // Select master variant by default
          const master = prod.variants.find((v: Variant) => v.is_master);
          setSelectedVariant(master || prod.variants[0]);
        } else {
          setError(result.Err);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setIsAdding(true);
    setAddSuccess(false);

    try {
      await addToCart(selectedVariant.id, quantity);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsAdding(false);
    }
  };


  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Product not found</h1>
        <Link to="/products" className="text-primary-600 hover:underline">
          &larr; Back to products
        </Link>
      </div>
    );
  }

  const inStock = selectedVariant ? Number(selectedVariant.stock) > 0 || selectedVariant.backorderable : false;
  const mainImage = product.images[selectedImageIndex]?.url || product.images[0]?.url;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-10 text-[10px] font-bold uppercase tracking-[0.2em]">
          <ol className="flex items-center space-x-3 text-gray-400">
            <li><Link to="/" className="hover:text-midnight transition-colors">Home</Link></li>
            <li><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></li>
            <li><Link to="/products" className="hover:text-midnight transition-colors">Products</Link></li>
            <li><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></li>
            <li className="text-midnight">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 item-start">
          {/* Left Column: Images */}
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm relative group">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {!inStock && (
                <div className="absolute top-6 left-6">
                  <span className="bg-midnight text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                    Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.id.toString()}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-xl overflow-hidden bg-gray-50 border-2 transition-all shadow-sm ${
                      selectedImageIndex === index
                        ? 'border-solidus-red ring-2 ring-solidus-red/20'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info */}
          <div className="lg:col-span-5 sticky top-32">
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                {product.taxons.map((taxon) => (
                  <Link
                    key={taxon.id.toString()}
                    to={`/products?category=${taxon.id}`}
                    className="text-[10px] font-black text-solidus-red uppercase tracking-[0.2em] hover:underline"
                  >
                    {taxon.name}
                  </Link>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-midnight tracking-tighter leading-none mb-6">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-4xl font-black text-midnight tracking-tighter">
                  {formatPrice(selectedVariant?.price || product.price)}
                </span>
                {selectedVariant && Number(selectedVariant.price) < Number(product.price) && (
                  <span className="text-xl text-gray-300 line-through font-bold">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-gray-500 leading-relaxed font-medium mb-10">
                  {product.description}
                </p>
              )}
            </div>

            <div className="space-y-8">
              {/* Variant Selectors */}
              {product.variants.filter(v => !v.is_master).length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-midnight uppercase tracking-[0.2em] mb-4">Select Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.variants
                      .filter(v => !v.is_master)
                      .map((v) => {
                        // Display Size (e.g., 'S', 'M') if available, otherwise fallback to SKU
                        const label = v.option_values.length > 0 ? v.option_values[0].presentation : v.sku;
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <button
                            key={v.id.toString()}
                            onClick={() => setSelectedVariant(v)}
                            className={`min-w-[3.5rem] px-4 py-3 rounded-md border text-sm font-bold transition-all ${isSelected
                                ? 'border-midnight bg-midnight text-white shadow-lg'
                                : 'border-gray-200 text-gray-900 hover:border-midnight'
                              }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="text-[10px] font-black text-midnight uppercase tracking-[0.2em] mb-4">Quantity</h3>
                <div className="inline-flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-midnight disabled:opacity-30 transition-all font-bold"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-black text-midnight">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-midnight disabled:opacity-30 transition-all font-bold"
                    disabled={selectedVariant ? quantity >= Number(selectedVariant.stock) && !selectedVariant.backorderable : true}
                  >
                    +
                  </button>
                </div>
                {!inStock && <p className="mt-2 text-xs text-solidus-red font-bold">Currently unavailable for purchase</p>}
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!inStock || isAdding}
                className={`w-full py-5 rounded-full text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-midnight/20 relative overflow-hidden group ${!inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-midnight text-white hover:bg-black'
                  }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isAdding ? (
                    <div className="spinner w-5 h-5 border-white border-t-transparent" />
                  ) : addSuccess ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Added Successfully
                    </>
                  ) : (
                    'Add to Bag'
                  )}
                </span>
              </button>
            </div>

            {/* Product Meta */}
            <div className="mt-12 pt-10 border-t border-gray-100 space-y-6">
              {[
                { label: 'Security', value: 'Secure SSL Transactions' },
                { label: 'Shipping', value: 'Fast & Reliable Shipping' },
                { label: 'Returns', value: '30-Day Money-Back Guarantee' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-5 h-5 rounded-full bg-sand flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-solidus-red" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-midnight uppercase tracking-widest leading-none mb-1">{item.label}</h4>
                    <p className="text-xs text-gray-400 font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Extended Specs Section */}
        {product.properties.length > 0 && (
          <div className="mt-32 pt-20 border-t border-gray-100">
            <h2 className="text-2xl font-black text-midnight tracking-tighter mb-12 flex items-center gap-4">
              Detailed Specifications
              <span className="h-px bg-gray-100 flex-1"></span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-12">
              {product.properties.map((prop, i) => (
                <div key={i} className="group">
                  <dt className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 group-hover:text-solidus-red transition-colors">
                    {prop.presentation}
                  </dt>
                  <dd className="text-base font-bold text-midnight tracking-tight border-l-2 border-gray-50 pl-4 group-hover:border-solidus-red transition-all">
                    {prop.value}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
