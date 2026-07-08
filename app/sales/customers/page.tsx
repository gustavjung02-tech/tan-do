"use client";

import { useEffect, useMemo, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { useAppStore } from "@/lib/store/app-store";
import { formatMoney } from "@/lib/utils";

export default function SalesCustomersPage() {
  const { orders, reloadOrders } = useAppStore();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    void reloadOrders();
  }, []);

  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; orderCount: number; total: number }>();
    for (const order of orders) {
      const key = order.customerPhone || order.customerName;
      const current = map.get(key) ?? { name: order.customerName, phone: order.customerPhone, orderCount: 0, total: 0 };
      current.orderCount += 1;
      current.total += order.total;
      map.set(key, current);
    }
    const keyword = searchText.trim().toLowerCase();
    return Array.from(map.values())
      .filter((customer) => !keyword || customer.name.toLowerCase().includes(keyword) || customer.phone.toLowerCase().includes(keyword))
      .sort((a, b) => b.total - a.total);
  }, [orders, searchText]);

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <h1 className="text-center text-xl font-black text-slate-950">Khách hàng</h1>
        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-700" placeholder="Tìm tên hoặc số điện thoại..." />
          <p className="mt-3 text-xs font-semibold text-slate-500">Đang hiển thị {customers.length} khách có đơn.</p>
        </section>
        <section className="mt-4 grid gap-3">
          {customers.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Chưa có dữ liệu khách hàng.</p>
          ) : customers.map((customer) => (
            <article key={customer.phone || customer.name} className="rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">{customer.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{customer.phone}</p>
                </div>
                <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">{customer.orderCount} đơn</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-500">Tổng đã đặt</p>
              <p className="mt-1 text-lg font-black text-blue-700">{formatMoney(customer.total)}</p>
            </article>
          ))}
        </section>
      </section>
      <SalesBottomNav />
    </main>
  );
}
