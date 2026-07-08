"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell, IconMenu } from "@/components/layout/icons";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Order, OrderStatus } from "@/lib/mock/types";
import { useAppStore } from "@/lib/store/app-store";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

type SalesTab = "new" | "active" | "completed" | "all";

const statCards = [
  { key: "new", label: "Mới", tone: "bg-red-50 text-red-700" },
  { key: "active", label: "Đang xử lý", tone: "bg-blue-50 text-blue-700" },
  { key: "completed", label: "Hoàn tất", tone: "bg-green-50 text-green-700" },
  { key: "all", label: "Tổng", tone: "bg-slate-100 text-slate-900" },
] as const;

function isActive(status: OrderStatus) {
  return status === "confirmed" || status === "processing";
}

function filterOrders(orders: Order[], tab: SalesTab) {
  if (tab === "new") return orders.filter((order) => order.status === "new");
  if (tab === "active") return orders.filter((order) => isActive(order.status));
  if (tab === "completed") return orders.filter((order) => order.status === "completed");
  return orders;
}

function OrderRow({ order, onAccept, onNext, onCancel }: { order: Order; onAccept: () => void; onNext: () => void; onCancel: () => void }) {
  return (
    <article className="rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">{order.code}</h3>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-700">{order.customerName}</p>
          <p className="mt-1 text-xs text-slate-500">{order.customerPhone}</p>
          <p className="mt-1 text-xs text-slate-500">{order.source === "customer" ? "Khách đặt" : "Sales tạo"} · {formatDateTime(order.createdAt)}</p>
        </div>
        <p className="text-right text-sm font-black text-blue-700">{formatMoney(order.total)}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <Link href={`/sales/orders/${order.id}`} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Chi tiết</Link>
        <div className="flex flex-wrap justify-end gap-2">
          {order.status === "new" && <button onClick={onAccept} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white">Nhận đơn</button>}
          {order.status === "confirmed" && <button onClick={onNext} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white">Xử lý</button>}
          {order.status === "processing" && <button onClick={onNext} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white">Hoàn tất</button>}
          {order.status !== "completed" && order.status !== "cancelled" && <button onClick={onCancel} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Hủy</button>}
        </div>
      </div>
    </article>
  );
}

export default function SalesPage() {
  const { orders, acceptOrder, updateOrderStatus, resetLocalData, reloadOrders } = useAppStore();
  const [activeTab, setActiveTab] = useState<SalesTab>("new");
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    await reloadOrders();
    setLoading(false);
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const counts = {
    new: orders.filter((order) => order.status === "new").length,
    active: orders.filter((order) => isActive(order.status)).length,
    completed: orders.filter((order) => order.status === "completed").length,
    all: orders.length,
  };

  const filteredOrders = filterOrders(orders, activeTab);

  async function downloadReport() {
    setReportError(null);
    if (!supabaseBrowser) return;
    const { data } = await supabaseBrowser.auth.getSession();
    const response = await fetch("/api/reports/orders", {
      headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
    });
    if (!response.ok) {
      setReportError("Không xuất được báo cáo. Anh kiểm tra lại phiên đăng nhập.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function nextStatus(order: Order) {
    if (order.status === "confirmed") await updateOrderStatus(order.id, "processing");
    if (order.status === "processing") await updateOrderStatus(order.id, "completed");
  }

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <IconMenu />
          <h1 className="text-center text-lg font-black text-slate-950">Sales Dashboard</h1>
          <IconBell count={counts.new} />
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <Link href="/sales/manual-order" className="rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white">Lên đơn tay</Link>
          <button onClick={() => void downloadReport()} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-blue-700 ring-1 ring-blue-100">Xuất báo cáo</button>
        </section>
        {reportError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{reportError}</p>}

        <section className="mt-5 grid grid-cols-4 gap-3">
          {statCards.map((card) => (
            <button key={card.key} onClick={() => setActiveTab(card.key)} className={`rounded-xl p-3 text-center ${card.tone} ${activeTab === card.key ? "ring-2 ring-blue-700" : ""}`}>
              <p className="text-xs font-bold">{card.label}</p>
              <p className="mt-2 text-2xl font-black">{counts[card.key]}</p>
            </button>
          ))}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Danh sách đơn hàng</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Đang hiển thị {filteredOrders.length}/{orders.length} đơn</p>
            </div>
            <button onClick={() => void loadOrders()} disabled={loading} className="text-sm font-black text-blue-700 disabled:opacity-50">{loading ? "Đang tải" : "Tải lại"}</button>
          </div>
          <div className="mt-3 grid gap-3">
            {loading ? (
              <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Đang tải đơn hàng...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Không có đơn hàng phù hợp.</p>
            ) : filteredOrders.map((order) => (
              <OrderRow key={order.id} order={order} onAccept={() => void acceptOrder(order.id)} onNext={() => void nextStatus(order)} onCancel={() => void updateOrderStatus(order.id, "cancelled")} />
            ))}
          </div>
        </section>

        <button onClick={resetLocalData} className="mt-6 text-sm font-bold text-slate-400 underline underline-offset-4">Reset dữ liệu local khi dev</button>
      </section>
      <SalesBottomNav />
    </main>
  );
}
