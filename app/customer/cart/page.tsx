"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppStore } from "@/lib/store/app-store";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const { profile } = useAuth();
  const { products, cart, cartTotal, addToCart, decreaseCartItem, removeCartItem, createCustomerOrder } = useAppStore();
  const [customerNote, setCustomerNote] = useState("");
  const [lastOrderCode, setLastOrderCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const items = cart
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item) => item.product);

  async function submitOrder() {
    if (submittingRef.current || items.length === 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setLastOrderCode(null);

    try {
      const clientRequestId = crypto.randomUUID();
      const order = await createCustomerOrder({ customerNote, clientRequestId });
      if (!order) {
        setSubmitError("Chưa gửi được đơn. Anh kiểm tra mạng rồi thử lại, giỏ hàng vẫn được giữ nguyên.");
        return;
      }

      setLastOrderCode(order.code);
      setCustomerNote("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không gửi được đơn hàng.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="phone-page pb-32">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/customer" className="text-2xl text-slate-900">←</Link>
          <h1 className="text-center text-lg font-black text-slate-950">Giỏ hàng</h1>
          <div />
        </header>

        <section className="mt-6 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <h2 className="text-sm font-black text-slate-950">Thông tin đặt hàng</h2>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100">
            <p className="font-black">{profile?.full_name ?? "Khách Tân Đô"}</p>
            <p className="mt-1">SĐT: {profile?.phone ?? "Chưa cập nhật"}</p>
            <p className="mt-1 text-xs text-emerald-700">Đơn sẽ được lưu theo tài khoản email đang đăng nhập.</p>
          </div>
          <textarea
            value={customerNote}
            disabled={submitting}
            onChange={(event) => setCustomerNote(event.target.value)}
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 disabled:bg-slate-50"
            placeholder="Ghi chú cho đơn hàng, ví dụ: giao sau 15h, gọi trước khi giao..."
          />
        </section>

        {lastOrderCode && (
          <div className="mt-4 rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-100">
            <p className="font-black">Đã gửi đơn {lastOrderCode}</p>
            <p className="mt-1 text-sm">Sales sẽ nhận thông báo và xác nhận trạng thái đơn.</p>
            <Link href="/customer/orders" className="mt-3 inline-block text-sm font-black text-green-800 underline underline-offset-4">Xem đơn hàng của tôi</Link>
          </div>
        )}

        <section className="mt-5 grid gap-2">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-100">
              <p className="font-semibold text-slate-600">Giỏ hàng đang trống.</p>
              <Link href="/customer" className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Chọn sản phẩm</Link>
            </div>
          ) : items.map(({ product, quantity }) => product && (
            <article key={product.id} className="grid grid-cols-[62px_1fr] gap-3 border-b border-slate-100 bg-white py-3">
              <img src={product.imageUrl} alt={product.name} className="h-16 w-12 rounded-lg object-cover" />
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="line-clamp-2 font-bold text-slate-950">{product.name}</h3>
                    <p className="text-xs text-slate-500">{product.unit}</p>
                    <p className="mt-1 text-sm font-black text-emerald-700">{formatMoney(product.price)}</p>
                  </div>
                  <button disabled={submitting} onClick={() => removeCartItem(product.id)} className="text-sm font-black text-slate-400 disabled:opacity-40">Xóa</button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                    <button disabled={submitting} onClick={() => decreaseCartItem(product.id)} className="h-8 w-9 text-lg disabled:opacity-40">−</button>
                    <span className="w-9 text-center text-sm font-black">{quantity}</span>
                    <button disabled={submitting} onClick={() => addToCart(product.id)} className="h-8 w-9 text-lg disabled:opacity-40">+</button>
                  </div>
                  <p className="text-sm font-black text-slate-950">{formatMoney(product.price * quantity)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {items.length > 0 && (
          <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Tạm tính</span><span>{formatMoney(cartTotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Phí khác</span><span>{formatMoney(0)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-black text-slate-950">
                <span>Tổng cộng</span><span className="text-emerald-700">{formatMoney(cartTotal)}</span>
              </div>
            </div>
            {submitError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{submitError}</p>}
            <button disabled={submitting || items.length === 0} onClick={submitOrder} className="mt-5 w-full rounded-xl bg-emerald-700 py-4 text-center font-black text-white shadow-sm disabled:bg-slate-300">
              {submitting ? "Đang gửi đơn..." : "Gửi đơn hàng"}
            </button>
          </section>
        )}
      </section>

      <CustomerBottomNav />
    </main>
  );
}
