"use client";
import Link from "next/link";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { InstallAppButton } from "@/components/ui/install-app-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/auth/auth-provider";

export default function CustomerAccountPage() {
  const { profile, signOut } = useAuth();

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">Tài khoản khách</h1>
          <NotificationBell />
        </div>
        <section className="mt-6 rounded-3xl bg-white p-5">
          <p className="font-black">{profile?.full_name ?? "Chưa cập nhật"}</p>
          <p>{profile?.phone ?? ""}</p>
          <Link className="mt-4 block rounded-xl bg-emerald-700 p-3 text-center font-black text-white" href="/customer/orders">
            Đơn hàng
          </Link>
          <InstallAppButton />
          <button type="button" className="mt-3 w-full rounded-xl bg-slate-100 p-3 font-black" onClick={() => void signOut()}>
            Đăng xuất
          </button>
        </section>
      </section>
      <CustomerBottomNav />
    </main>
  );
}
