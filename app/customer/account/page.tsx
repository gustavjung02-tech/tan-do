"use client";

import Link from "next/link";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { useAuth } from "@/components/auth/auth-provider";

export default function CustomerAccountPage() {
  const { profile, signOut } = useAuth();

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-8">
        <div className="text-center">
          <img src="/icons/tando-logo.png" alt="Tân Đô F&B" className="mx-auto h-20 w-20 rounded-3xl object-cover shadow-sm" />
          <h1 className="mt-4 text-xl font-black text-slate-950">Tài khoản khách</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Đơn hàng và thông báo được lưu theo tài khoản này.</p>
        </div>

        <section className="mt-6 rounded-3xl bg-white p-5 card-shadow ring-1 ring-slate-100">
          <div className="grid gap-3 text-sm">
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Tên quán / tên khách</p>
              <p className="mt-1 font-black text-slate-950">{profile?.full_name ?? "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Số điện thoại</p>
              <p className="mt-1 font-black text-slate-950">{profile?.phone ?? "Chưa cập nhật"}</p>
            </div>
          </div>

          <Link href="/customer/orders" className="mt-5 block rounded-2xl bg-emerald-700 px-4 py-4 text-center font-black text-white">Xem đơn hàng của tôi</Link>
          <button onClick={() => void signOut()} className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-4 font-black text-slate-700">Đăng xuất</button>
        </section>
      </section>

      <CustomerBottomNav />
    </main>
  );
}
