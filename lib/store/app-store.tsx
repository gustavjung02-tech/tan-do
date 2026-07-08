"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockProducts } from "@/lib/mock/data";
import type { CartItem, Order, OrderStatus, Product, SelectedProductOptions } from "@/lib/mock/types";
import { fetchProductsWithFallback } from "@/lib/services/products";
import { supabaseBrowser } from "@/lib/supabase/client";

type ManualOrderPayload = {
  customerRecordId?: string;
  customerName: string;
  customerPhone: string;
  salesNote?: string;
  items: CartItem[];
};

type DataSource = "mock" | "supabase";

type AppStore = {
  products: Product[];
  productSource: DataSource;
  productLoadError?: string;
  orderSource: DataSource;
  orderLoadError?: string;
  cart: CartItem[];
  orders: Order[];
  cartCount: number;
  cartTotal: number;
  hydrated: boolean;
  reloadProducts: () => Promise<void>;
  reloadOrders: () => Promise<void>;
  addToCart: (productId: string, options?: SelectedProductOptions) => void;
  decreaseCartItem: (productId: string, options?: SelectedProductOptions) => void;
  removeCartItem: (productId: string, options?: SelectedProductOptions) => void;
  clearCart: () => void;
  createCustomerOrder: (payload: { customerNote?: string; clientRequestId?: string }) => Promise<Order | null>;
  acceptOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  createManualOrder: (payload: ManualOrderPayload) => Promise<Order | null>;
  resetLocalData: () => void;
};

const StoreContext = createContext<AppStore | null>(null);
const CART_KEY = "tan-do:cart:v2";

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeOptions(options?: SelectedProductOptions): SelectedProductOptions | undefined {
  if (!options) return undefined;
  const entries = Object.entries(options)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => key && value);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function sameOptions(a?: SelectedProductOptions, b?: SelectedProductOptions) {
  const left = normalizeOptions(a) ?? {};
  const right = normalizeOptions(b) ?? {};
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}

export function formatProductWithOptions(productName: string, options?: SelectedProductOptions) {
  const normalized = normalizeOptions(options);
  if (!normalized) return productName;
  const suffix = Object.entries(normalized).map(([key, value]) => `${key}: ${value}`).join(", ");
  return `${productName} — ${suffix}`;
}

function resolveProductPrice(product: Product, options?: SelectedProductOptions) {
  const variant = product.variants?.find((item) => Object.entries(item.options).every(([key, value]) => options?.[key] === value));
  return variant?.price ?? product.price;
}

function toOrderItems(products: Product[], items: CartItem[], timestamp = Date.now()): Order["items"] {
  return items
    .map((item, index) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product || item.quantity <= 0) return null;

      return {
        id: `oi-${timestamp}-${index}`,
        productId: product.id,
        productName: formatProductWithOptions(product.name, item.options),
        unitPrice: resolveProductPrice(product, item.options),
        quantity: item.quantity,
        lineTotal: resolveProductPrice(product, item.options) * item.quantity,
      };
    })
    .filter(Boolean) as Order["items"];
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabaseBrowser) return {};
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function fetchJson<T>(url: string, init?: RequestInit, options?: { auth?: boolean }): Promise<T> {
  const authHeaders = options?.auth ? await getAuthHeaders() : {};
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Có lỗi khi xử lý dữ liệu.");
  }
  return payload as T;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [productSource, setProductSource] = useState<DataSource>("mock");
  const [productLoadError, setProductLoadError] = useState<string | undefined>();
  const [orderSource, setOrderSource] = useState<DataSource>("supabase");
  const [orderLoadError, setOrderLoadError] = useState<string | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);

  async function reloadProducts() {
    const result = await fetchProductsWithFallback();
    setProducts(result.products);
    setProductSource(result.source);
    setProductLoadError(result.error);
  }

  async function reloadOrders() {
    try {
      const result = await fetchJson<{ orders: Order[] }>("/api/orders", undefined, { auth: true });
      setOrders(result.orders);
      setOrderSource("supabase");
      setOrderLoadError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không đọc được đơn hàng từ Supabase.";
      setOrderLoadError(message);
      setOrderSource("supabase");
      setOrders([]);
    }
  }

  useEffect(() => {
    setCart(safeParse<CartItem[]>(window.localStorage.getItem(CART_KEY), []));
    setHydrated(true);
    void reloadProducts();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product ? resolveProductPrice(product, item.options) : 0) * item.quantity;
  }, 0);

  const value = useMemo<AppStore>(() => ({
    products,
    productSource,
    productLoadError,
    orderSource,
    orderLoadError,
    cart,
    orders,
    cartCount,
    cartTotal,
    hydrated,
    reloadProducts,
    reloadOrders,
    addToCart(productId, options) {
      const normalizedOptions = normalizeOptions(options);
      setCart((current) => {
        const exists = current.find((item) => item.productId === productId && sameOptions(item.options, normalizedOptions));
        if (!exists) return [...current, { productId, quantity: 1, options: normalizedOptions }];
        return current.map((item) => item.productId === productId && sameOptions(item.options, normalizedOptions) ? { ...item, quantity: item.quantity + 1 } : item);
      });
    },
    decreaseCartItem(productId, options) {
      const normalizedOptions = normalizeOptions(options);
      setCart((current) => current
        .map((item) => item.productId === productId && sameOptions(item.options, normalizedOptions) ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0));
    },
    removeCartItem(productId, options) {
      const normalizedOptions = normalizeOptions(options);
      setCart((current) => current.filter((item) => !(item.productId === productId && sameOptions(item.options, normalizedOptions))));
    },
    clearCart() {
      setCart([]);
    },
    async createCustomerOrder(payload) {
      const localItems = toOrderItems(products, cart);
      if (localItems.length === 0) return null;

      try {
        const result = await fetchJson<{ order: Order }>("/api/orders", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            source: "customer",
            items: cart,
          }),
        }, { auth: true });
        setOrders((current) => [result.order, ...current.filter((order) => order.id !== result.order.id)]);
        setOrderSource("supabase");
        setOrderLoadError(undefined);
        setCart([]);
        return result.order;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không tạo được đơn hàng.";
        setOrderLoadError(message);
        setOrderSource("supabase");
        return null;
      }
    },
    async acceptOrder(orderId) {
      await value.updateOrderStatus(orderId, "confirmed");
    },
    async updateOrderStatus(orderId, status) {
      const previous = orders;
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status, salesName: status !== "new" ? "Sales" : order.salesName } : order));
      try {
        await fetchJson<{ order: { id: string; status: OrderStatus } }>(`/api/orders/${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }, { auth: true });
        setOrderSource("supabase");
        setOrderLoadError(undefined);
      } catch (error) {
        setOrders(previous);
        const message = error instanceof Error ? error.message : "Không cập nhật được trạng thái đơn hàng.";
        setOrderLoadError(message);
      }
    },
    async createManualOrder(payload) {
      const localItems = toOrderItems(products, payload.items);
      if (localItems.length === 0) return null;

      try {
        const result = await fetchJson<{ order: Order }>("/api/orders", {
          method: "POST",
          body: JSON.stringify({ ...payload, source: "sales_manual" }),
        }, { auth: true });
        setOrders((current) => [result.order, ...current.filter((order) => order.id !== result.order.id)]);
        setOrderSource("supabase");
        setOrderLoadError(undefined);
        return result.order;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không tạo được đơn hàng.";
        setOrderLoadError(message);
        setOrderSource("supabase");
        return null;
      }
    },
    resetLocalData() {
      setCart([]);
      setOrders([]);
      setOrderSource("supabase");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CART_KEY);
      }
    },
  }), [cart, cartCount, cartTotal, hydrated, orderLoadError, orderSource, orders, productLoadError, productSource, products]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAppStore must be used inside StoreProvider");
  return store;
}
