import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/backend';

interface ProductCardProps {
  id: bigint;
  name: string;
  slug: string;
  description?: string | null;
  price: bigint;
  stock: bigint;
  imageUrl?: string | null;
}

export default function ProductCard({ name, slug, description, price, stock, imageUrl }: ProductCardProps) {
  const inStock = Number(stock) > 0;

  return (
    <Link to={`/products/${slug}`} className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-base transition-all duration-300">
      <div className="aspect-[4/5] overflow-hidden bg-gray-50 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badge Overlay */}
        {!inStock && (
          <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
            <span className="bg-midnight/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decentralized Goods</span>
          <h3 className="font-bold text-midnight group-hover:text-solidus-red transition-colors line-clamp-1 text-base tracking-tight">
            {name}
          </h3>
          {description && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
          <span className="text-lg font-black text-midnight tracking-tighter">
            {formatPrice(price)}
          </span>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-solidus-red group-hover:text-white transition-all duration-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
