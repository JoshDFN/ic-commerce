import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBackend } from '../lib/backend';

// Session expires after 7 days of inactivity
const SESSION_EXPIRY_DAYS = 7;
const SESSION_KEY = 'ic_commerce_session_id';
const SESSION_TIMESTAMP_KEY = 'ic_commerce_session_timestamp';

function getOrCreateSession(): string {
  const now = Date.now();
  const storedTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
  const storedSession = localStorage.getItem(SESSION_KEY);

  // Check if session exists and is not expired
  if (storedSession && storedTimestamp) {
    const elapsed = now - parseInt(storedTimestamp, 10);
    const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (elapsed < maxAge) {
      // Refresh timestamp on access
      localStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
      return storedSession;
    }
    // Session expired, remove old data
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  }

  // Create new session
  const newSession = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newSession);
  localStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
  return newSession;
}

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
  const [sessionId] = useState(() => getOrCreateSession());

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const backend = await getBackend();
      const result = await backend.get_cart(sessionId ? [sessionId] : []);

      if ('Ok' in result) {
        setCart(result.Ok[0] || null);
      } else {
        // Don't error if no cart found for guest
        setCart(null);
      }
    } catch {
      // Silently handle cart load failures for guests
      setCart(null);
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
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add to cart';
      setError(message);
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
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update quantity';
      setError(message);
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
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to remove item';
      setError(message);
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
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to apply coupon';
      setError(message);
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
