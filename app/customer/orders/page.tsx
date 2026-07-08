"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Order } from "@/lib/mock/types";
import { formatDateTime, formatMoney } from "@/lib/utils";

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabaseBrowser) return {};
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function fetchJson<T>(url: string): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Có lỗi khi đọc dữ liệu.");
  return payload as T;
}

export default function CustomerOrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<{ orders: Order[] }>("/api/orders?source=customer");
      setOrders(result.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="pt-6 text-center">
          <h1 className="text-xl font-black text-slate-950">Đơn hàng của tôi</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Đơn được lưu theo tài khoản {profile?.full_name ?? "khách"}.</p>
        </header>

        <button onClick={() => void loadOrders()} disabled={loading} className="mt-5 w-full rounded-2xl bg-white px-4 py-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100 disabled:opacity-60">
          {loading ? "Đang tải..." : "Tải lại đơn hàng"}
        </button>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

        <section className="mt-5 grid gap-3">
          {loading && <p className="rounded-2xl bg-white p-5 text-center font-bold text-slate-500 ring-1 ring-slate-100">Đang tải đơn hàng...</p>}

          {!loading && orders.length === 0 && !error && (
            <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-100">
              <p className="font-semibold text-slate-600">Tài khoản này chưa có đơn hàng nào.</p>
              <Link href="/customer" className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Đặt đơn đầu tiên</Link>
            </div>
          )}

          {orders.map((order) => (
            <Link href={`/customer/orders/${order.id}`} key={order.id} className="block rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">{order.code}</h2>
                  <p className="mt-2 text-sm text-slate-500">{formatDateTime(order.createdAt)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <p className="text-xs font-bold">Tổng tiền</p>
                <p className="mt-1 text-xl font-black">{formatMoney(order.total)}</p>
              </div>

              <div className="mt-4 grid gap-2 border-t border-slate-100 pt-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">SL: {item.quantity} × {formatMoney(item.unitPrice)}</p>
                    </div>
                    <p className="font-black text-slate-950">{formatMoney(item.lineTotal)}</p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </section>
      </section>

      <CustomerBottomNav />
    </main>
  );
}
