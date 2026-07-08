"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Order, OrderStatus } from "@/lib/mock/types";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

const nextAction: Partial<Record<OrderStatus, { label: string; status: OrderStatus; tone: string }>> = {
  new: { label: "Nhận đơn", status: "confirmed", tone: "bg-blue-700 text-white" },
  confirmed: { label: "Chuyển xử lý", status: "processing", tone: "bg-blue-700 text-white" },
  processing: { label: "Hoàn tất", status: "completed", tone: "bg-green-600 text-white" },
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabaseBrowser) return {};
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Có lỗi khi xử lý dữ liệu.");
  return payload as T;
}

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function changeStatus(status: OrderStatus) {
    if (!order || saving) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được trạng thái đơn hàng.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [params.id]);

  const action = order ? nextAction[order.status] : undefined;

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[48px_1fr_56px] items-center">
          <Link href="/sales" className="text-2xl text-slate-900">←</Link>
          <h1 className="text-center text-lg font-black text-slate-950">Chi tiết đơn hàng</h1>
          <button onClick={() => void loadOrder()} disabled={loading || saving} className="text-sm font-black text-blue-700 disabled:opacity-50">Tải lại</button>
        </header>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Đang tải đơn hàng...</div>
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

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <p className="text-xs font-bold">Tổng tiền</p>
                  <p className="mt-1 text-lg font-black">{formatMoney(order.total)}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <p className="text-xs font-bold">Số sản phẩm</p>
                  <p className="mt-1 text-lg font-black">{order.items.length}</p>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <h3 className="font-black text-slate-950">Thông tin khách</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <p className="flex justify-between gap-3"><span className="text-slate-500">Tên khách</span><span className="text-right font-bold text-slate-900">{order.customerName}</span></p>
                <p className="flex justify-between gap-3"><span className="text-slate-500">Số điện thoại</span><span className="font-bold text-slate-900">{order.customerPhone}</span></p>
                <p className="flex justify-between gap-3"><span className="text-slate-500">Nguồn đơn</span><span className="font-bold text-slate-900">{order.source === "customer" ? "Khách đặt" : "Sales tạo"}</span></p>
              </div>
              {order.customerNote && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Ghi chú khách: {order.customerNote}</p>}
              {order.salesNote && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Ghi chú sales: {order.salesNote}</p>}
            </section>

            <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <h3 className="font-black text-slate-950">Sản phẩm trong đơn</h3>
              <div className="mt-3 grid gap-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.productName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">SL: {item.quantity} × {formatMoney(item.unitPrice)}</p>
                      </div>
                      <p className="text-right font-black text-blue-700">{formatMoney(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-4 grid gap-3">
              {action && <button disabled={saving} onClick={() => void changeStatus(action.status)} className={`rounded-2xl px-4 py-4 font-black disabled:bg-slate-300 ${action.tone}`}>{saving ? "Đang lưu..." : action.label}</button>}
              {order.status !== "completed" && order.status !== "cancelled" && <button disabled={saving} onClick={() => void changeStatus("cancelled")} className="rounded-2xl bg-slate-100 px-4 py-4 font-black text-slate-700 disabled:bg-slate-200">Hủy đơn</button>}
            </section>
          </>
        ) : null}
      </section>
      <SalesBottomNav />
    </main>
  );
}
