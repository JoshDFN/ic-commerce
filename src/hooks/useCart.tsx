import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBackend } from '../lib/backend';

interface LineItem {
  id: bigint;
  variant_id: bigint;
  quantity: bigint;
  price: bigint;
  currency: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
}

interface Adjustment {
  id: bigint;
  label: string;
  amount: bigint;
  included: boolean;
}

interface Cart {
  id: bigint;
  number: string;
  state: string;
  item_total: bigint;
  shipment_total: bigint;
  adjustment_total: bigint;
  promo_total: bigint;
  additional_tax_total: bigint;
  total: bigint;
  item_count: bigint;
  line_items: LineItem[];
  adjustments: Adjustment[];
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  addToCart: (variantId: bigint, quantity: number) => Promise<void>;
  updateQuantity: (lineItemId: bigint, quantity: number) => Promise<void>;
  removeItem: (lineItemId: bigint) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    let sid = localStorage.getItem('ic_commerce_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('ic_commerce_session_id', sid);
    }
    return sid;
  });

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const backend = await getBackend();
      const result = await backend.get_cart(sessionId ? [sessionId] : []);

      if ('Ok' in result) {
        setCart(result.Ok[0] || null);
      } else {
        // setError(result.Err); // Don't error if no cart found for guest
        setCart(null);
      }
    } catch (e: any) {
      console.error(e);
      // setError(e.message || 'Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (variantId: bigint, quantity: number) => {
    try {
      setError(null);
      const backend = await getBackend();
      const result = await backend.add_to_cart(variantId, BigInt(quantity), sessionId ? [sessionId] : []);

      if ('Ok' in result) {
        setCart(result.Ok);
      } else {
        throw new Error(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const updateQuantity = async (lineItemId: bigint, quantity: number) => {
    try {
      setError(null);
      const backend = await getBackend();
      const result = await backend.update_line_item(lineItemId, BigInt(quantity), sessionId ? [sessionId] : []);

      if ('Ok' in result) {
        setCart(result.Ok);
      } else {
        throw new Error(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const removeItem = async (lineItemId: bigint) => {
    try {
      setError(null);
      const backend = await getBackend();
      const result = await backend.remove_from_cart(lineItemId, sessionId ? [sessionId] : []);

      if ('Ok' in result) {
        setCart(result.Ok);
      } else {
        throw new Error(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const applyCoupon = async (code: string) => {
    try {
      setError(null);
      const backend = await getBackend();
      const result = await backend.apply_coupon({ code }, sessionId ? [sessionId] : []);

      if ('Ok' in result) {
        setCart(result.Ok);
      } else {
        throw new Error(result.Err);
      }
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  return (
    <CartContext.Provider value={{ cart, isLoading, error, addToCart, updateQuantity, removeItem, applyCoupon, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
