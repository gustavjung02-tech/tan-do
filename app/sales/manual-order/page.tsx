"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import type { CartItem } from "@/lib/mock/types";
import { useAppStore } from "@/lib/store/app-store";
import { formatMoney } from "@/lib/utils";

export default function ManualOrderPage() {
  const { products, createManualOrder } = useAppStore();
  const [customerName, setCustomerName] = useState("Khách tạo nhanh");
  const [customerPhone, setCustomerPhone] = useState("0900000999");
  const [salesNote, setSalesNote] = useState("");
  const [manualItems, setManualItems] = useState<CartItem[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const rows = manualItems
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item) => item.product);
  const total = useMemo(() => rows.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0), [rows]);

  function addProduct(productId: string) {
    setManualItems((current) => {
      const exists = current.find((item) => item.productId === productId);
      if (!exists) return [...current, { productId, quantity: 1 }];
      return current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
    });
    setCreatedCode(null);
    setSubmitError(null);
  }

  function decreaseProduct(productId: string) {
    setManualItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0));
    setCreatedCode(null);
  }

  function removeProduct(productId: string) {
    setManualItems((current) => current.filter((item) => item.productId !== productId));
    setCreatedCode(null);
  }

  async function createOrder() {
    if (submittingRef.current || rows.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError("Cần nhập tên khách và số điện thoại trước khi tạo đơn.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setCreatedCode(null);

    try {
      const order = await createManualOrder({ customerName, customerPhone, salesNote, items: manualItems });
      if (!order) {
        setSubmitError("Chưa tạo được đơn. Anh kiểm tra mạng hoặc phiên đăng nhập rồi thử lại.");
        return;
      }

      setCreatedCode(order.code);
      setManualItems([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không tạo được đơn hàng.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/sales" className="text-2xl text-slate-900">←</Link>
          <h1 className="text-center text-lg font-black text-slate-950">Lên đơn tay</h1>
          <div />
        </header>

        {createdCode && (
          <div className="mt-5 rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-100">
            <p className="font-black">Đã tạo đơn {createdCode}</p>
            <p className="mt-1 text-sm">Đơn đã được lưu vào Supabase và hiển thị ở dashboard sales.</p>
          </div>
        )}

        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <h2 className="font-black text-slate-950">Thông tin khách</h2>
          <div className="mt-3 grid gap-3">
            <input value={customerName} disabled={submitting} onChange={(event) => { setCustomerName(event.target.value); setSubmitError(null); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Tên khách" />
            <input value={customerPhone} disabled={submitting} onChange={(event) => { setCustomerPhone(event.target.value); setSubmitError(null); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Số điện thoại" />
            <textarea value={salesNote} disabled={submitting} onChange={(event) => setSalesNote(event.target.value)} className="min-h-16 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Ghi chú sales" />
          </div>
        </section>

        <section className="mt-5">
          <h2 className="font-black text-slate-950">Chọn sản phẩm</h2>
          <div className="mt-3 grid gap-3">
            {products.map((product) => (
              <button key={product.id} disabled={submitting} onClick={() => addProduct(product.id)} className="grid grid-cols-[56px_1fr_38px] items-center gap-3 rounded-2xl bg-white p-3 text-left card-shadow ring-1 ring-slate-100 disabled:opacity-50">
                <img src={product.imageUrl} alt={product.name} className="h-14 w-12 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{product.name}</p>
                  <p className="mt-1 text-sm font-black text-blue-700">{formatMoney(product.price)}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-xl text-white">+</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <h2 className="font-black text-slate-950">Đơn đang lên</h2>
          <div className="mt-3 grid gap-3">
            {rows.length === 0 ? <p className="text-sm text-slate-500">Chưa có sản phẩm.</p> : rows.map(({ product, quantity }) => product && (
              <article key={product.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{product.name}</p>
                    <p className="mt-1 text-sm text-blue-700">{formatMoney(product.price)}</p>
                  </div>
                  <p className="font-black text-slate-950">{formatMoney(product.price * quantity)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button disabled={submitting} onClick={() => removeProduct(product.id)} className="text-sm font-bold text-slate-400 disabled:opacity-40">Xóa</button>
                  <div className="inline-flex items-center rounded-lg border border-slate-200">
                    <button disabled={submitting} onClick={() => decreaseProduct(product.id)} className="h-8 w-9 disabled:opacity-40">−</button>
                    <span className="w-9 text-center text-sm font-black">{quantity}</span>
                    <button disabled={submitting} onClick={() => addProduct(product.id)} className="h-8 w-9 disabled:opacity-40">+</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {submitError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{submitError}</p>}

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm text-slate-500">Tổng cộng</p>
              <p className="text-2xl font-black text-blue-700">{formatMoney(total)}</p>
            </div>
            <button disabled={submitting || rows.length === 0} onClick={createOrder} className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:bg-slate-300">
              {submitting ? "Đang tạo..." : "Tạo đơn"}
            </button>
          </div>
        </section>
      </section>
      <SalesBottomNav />
    </main>
  );
}
