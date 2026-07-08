"use client";

import { InstallAppButton } from "@/components/ui/install-app-button";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { useAuth } from "@/components/auth/auth-provider";

export default function SalesAccountPage() {
  const { profile, signOut } = useAuth();

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-8">
        <h1 className="text-center text-xl font-black text-slate-950">Tài khoản sales</h1>
        <section className="mt-6 rounded-3xl bg-white p-5 card-shadow ring-1 ring-slate-100">
          <div className="grid gap-3 text-sm">
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-700 ring-1 ring-blue-100">
              <p className="text-xs font-bold uppercase tracking-wide">Tên</p>
              <p className="mt-1 font-black">{profile?.full_name ?? "Sales Tân Đô"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-slate-700 ring-1 ring-slate-100">
              <p className="text-xs font-bold uppercase tracking-wide">Quyền</p>
              <p className="mt-1 font-black">{profile?.role ?? "sales"}</p>
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">Sales/admin có quyền xem toàn bộ đơn, tạo đơn tay, xử lý trạng thái và xuất báo cáo.</p>
          <button onClick={() => void signOut()} className="mt-5 w-full rounded-2xl bg-slate-100 px-4 py-4 font-black text-slate-700">Đăng xuất</button>
        <InstallAppButton />
      </section>
      </section>
      <SalesBottomNav />
    </main>
  );
}
