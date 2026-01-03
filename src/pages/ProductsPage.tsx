import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBackend } from '../lib/backend';
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

interface Taxon {
  id: bigint;
  name: string;
  permalink: string | null;
  parent_id: bigint | null;
  product_count: bigint;
  depth: bigint;
}

interface Taxonomy {
  id: bigint;
  name: string;
  taxons: Taxon[];
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const taxonId = searchParams.get('category');
  const sort = searchParams.get('sort') || 'created_at';
  const query = searchParams.get('q') || '';

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const backend = await getBackend();

        // Load products
        const result = await backend.get_products({
          page: [BigInt(page)],
          per_page: [BigInt(12)],
          q: query ? [query] : [],
          taxon_id: taxonId ? [BigInt(taxonId)] : [],
          sort: [sort],
          in_stock: [],
        });

        if ('Ok' in result) {
          setProducts(result.Ok.products);
          setTotalCount(Number(result.Ok.total_count));
          setTotalPages(Number(result.Ok.total_pages));
        } else {
          setError(result.Err);
        }

        // Load taxonomies (categories)
        const taxResult = await backend.get_taxonomies();
        if ('Ok' in taxResult) {
          setTaxonomies(taxResult.Ok);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [page, taxonId, sort, query]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q') as string;
    setSearchParams({ q, page: '1' });
  };

  const handleCategoryChange = (id: string) => {
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set('category', id);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-28 space-y-8">
            {/* Search (Mobile/Tablet specific if needed, but keeping for completeness) */}
            <div className="md:hidden">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Search products..."
                  className="w-full bg-white border border-gray-100 rounded-full px-6 py-3 text-sm focus:border-solidus-red outline-none transition-all shadow-sm"
                />
                <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-black text-midnight uppercase tracking-[0.2em] mb-6">Collections</h3>
              <ul className="space-y-4">
                <li>
                  <button
                    onClick={() => handleCategoryChange('')}
                    className={`group flex items-center justify-between w-full text-sm transition-all ${!taxonId ? 'text-solidus-red font-bold translate-x-1' : 'text-gray-500 hover:text-midnight hover:translate-x-1'}`}
                  >
                    <span>All Products</span>
                    {!taxonId && <span className="w-1.5 h-1.5 rounded-full bg-solidus-red"></span>}
                  </button>
                </li>
                {taxonomies.flatMap(t =>
                  t.taxons.filter(tx => Number(tx.depth) === 1).map(taxon => (
                    <li key={taxon.id.toString()}>
                      <button
                        onClick={() => handleCategoryChange(taxon.id.toString())}
                        className={`group flex items-center justify-between w-full text-sm transition-all ${taxonId === taxon.id.toString() ? 'text-solidus-red font-bold translate-x-1' : 'text-gray-500 hover:text-midnight hover:translate-x-1'}`}
                      >
                        <span className="flex items-center gap-2">
                          {taxon.name}
                          <span className="text-[10px] text-gray-300 font-bold">({Number(taxon.product_count)})</span>
                        </span>
                        {taxonId === taxon.id.toString() && <span className="w-1.5 h-1.5 rounded-full bg-solidus-red"></span>}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Quick Filters */}
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-sm font-black text-midnight uppercase tracking-[0.2em] mb-6">Sort By</h3>
              <div className="space-y-3">
                {[
                  { value: 'created_at', label: 'New Arrivals' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                  { value: 'name_asc', label: 'Name: A-Z' },
                ].map((s) => (
                  <label key={s.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="sort"
                      value={s.value}
                      checked={sort === s.value}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="w-4 h-4 border-gray-200 text-solidus-red focus:ring-solidus-red"
                    />
                    <span className={`text-sm transition-colors ${sort === s.value ? 'text-midnight font-bold' : 'text-gray-500 group-hover:text-midnight'}`}>
                      {s.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Header Area */}
          <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-10 border-b border-gray-100 pb-8">
            <div>
              <h1 className="text-3xl font-black text-midnight tracking-tight">
                {query ? `Search: "${query}"` : taxonId ? taxonomies.flatMap(t => t.taxons).find(tx => tx.id.toString() === taxonId)?.name || 'Products' : 'Our Collection'}
              </h1>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                Displaying {products.length} of {totalCount} items
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="spinner w-10 h-10" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-solidus-red p-6 rounded-xl text-center font-medium border border-red-100">{error}</div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-24 text-center">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" />
              </svg>
              <h3 className="text-lg font-bold text-midnight mb-1">No products found</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters to find what you're looking for.</p>
              <button
                onClick={() => {
                  setSearchParams({});
                }}
                className="mt-6 text-solidus-red font-bold text-sm uppercase tracking-widest hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {products.map((product) => (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-20 gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', (page - 1).toString());
                      setSearchParams(params);
                    }}
                    className="p-2 rounded-full border border-gray-100 text-midnight hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.set('page', p.toString());
                          setSearchParams(params);
                        }}
                        className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${p === page
                          ? 'bg-midnight text-white shadow-lg shadow-midnight/30'
                          : 'bg-white border border-gray-100 text-gray-400 hover:border-midnight hover:text-midnight'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={page === totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', (page + 1).toString());
                      setSearchParams(params);
                    }}
                    className="p-2 rounded-full border border-gray-100 text-midnight hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
