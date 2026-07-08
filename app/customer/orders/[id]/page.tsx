"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { StatusBadge } from "@/components/ui/status-badge";
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
  if (!response.ok) throw new Error(payload.error ?? "Không tải được dữ liệu.");
  return payload as T;
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<{ order: Order }>(`/api/orders/${params.id}`);
      setOrder(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được chi tiết đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [params.id]);

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[56px_1fr_56px] items-center pt-4">
          <Link href="/customer/orders" className="text-sm font-black text-emerald-700">← Đơn</Link>
          <h1 className="text-center text-lg font-black text-slate-950">Chi tiết đơn</h1>
          <button onClick={() => void loadOrder()} disabled={loading} className="text-right text-sm font-black text-emerald-700 disabled:opacity-50">Tải lại</button>
        </header>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-5 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">Đang tải đơn hàng...</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</div>
        ) : order ? (
          <>
            <section className="mt-6 rounded-3xl bg-white p-5 card-shadow ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã đơn hàng</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{order.code}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{formatDateTime(order.createdAt)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                <p className="text-xs font-bold uppercase tracking-wide">Tổng tiền</p>
                <p className="mt-1 text-2xl font-black">{formatMoney(order.total)}</p>
              </div>
            </section>

            <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <h3 className="font-black text-slate-950">Thông tin nhận đơn</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <p className="flex justify-between gap-3"><span className="text-slate-500">Tên</span><span className="text-right font-bold text-slate-900">{order.customerName}</span></p>
                <p className="flex justify-between gap-3"><span className="text-slate-500">Số điện thoại</span><span className="font-bold text-slate-900">{order.customerPhone}</span></p>
              </div>
              {order.customerNote && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Ghi chú: {order.customerNote}</p>}
              {order.salesNote && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Phản hồi sales: {order.salesNote}</p>}
            </section>

            <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <h3 className="font-black text-slate-950">Sản phẩm</h3>
              <div className="mt-3 grid gap-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.productName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">SL: {item.quantity} × {formatMoney(item.unitPrice)}</p>
                      </div>
                      <p className="text-right font-black text-emerald-700">{formatMoney(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>

      <CustomerBottomNav />
    </main>
  );
}
