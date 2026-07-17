"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { InstallAppButton } from "@/components/ui/install-app-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/auth/auth-provider";
import { supabaseBrowser } from "@/lib/supabase/client";
import Modal from "@/components/ui/modal";
import CustomerProfileForm, { CustomerFormData } from "@/components/customer/customer-profile-form";

export default function CustomerAccountPage() {
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerFormData | null>(null);
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        if (!supabaseBrowser) {
          setCustomer(null);
          return;
        }

        const { data } = await supabaseBrowser.auth.getSession();
        if (!data.session?.access_token) {
          setCustomer(null);
          return;
        }

        const res = await fetch("/api/customer/profile", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });

        if (!res.ok) {
          setCustomer(null);
          return;
        }

        const payload = await res.json().catch(() => null);
        if (!mounted) return;
        setCustomer(payload?.customer ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

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
          <div className="mt-4 grid gap-3">
            <Link className="block rounded-xl bg-emerald-700 p-3 text-center font-black text-white" href="/customer/orders">Đơn hàng</Link>
            <div className="rounded-xl border p-3">
              <p className="font-black">Thông tin quán</p>
              {loading ? (
                <p className="mt-2 text-sm text-slate-500">Đang tải...</p>
              ) : (
                <div className="mt-2 text-sm text-slate-700">
                  <p className="truncate">Tên quán: {customer?.name ?? "Chưa có"}</p>
                  <p className="truncate">Số điện thoại: {customer?.phone ?? "Chưa có"}</p>
                  <p className="truncate">Người liên hệ: {customer?.contactPerson ?? "Chưa có"}</p>
                  <p className="truncate">Địa chỉ: {customer?.address ?? "Chưa có"}</p>
                  <p className="truncate">Tỉnh/Thành phố: {customer?.province ?? "Chưa có"}</p>
                  <p className="truncate">Xã/Phường: {customer?.ward ?? "Chưa có"}</p>
                </div>
              )}
              <button type="button" onClick={() => setOpen(true)} className="mt-3 w-full rounded-xl bg-slate-100 p-3 font-black">Chỉnh sửa thông tin quán</button>
            </div>
            <InstallAppButton />
            <button type="button" className="w-full rounded-xl bg-slate-100 p-3 font-black" onClick={() => void signOut()}>Đăng xuất</button>
          </div>
        </section>
      </section>
      <CustomerBottomNav />

      <Modal open={open} title="Chỉnh sửa thông tin quán" onClose={() => setOpen(false)}>
        <CustomerProfileForm
          initial={customer ?? undefined}
          onSaved={(saved) => {
            // update local summary and show success
            setCustomer((prev) => ({ ...prev, ...(saved ?? {}) } as CustomerFormData));
            setSuccessMessage("Đã cập nhật thông tin quán");
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
          onClose={() => setOpen(false)}
        />
      </Modal>

      {successMessage && <div className="fixed left-1/2 top-6 -translate-x-1/2 rounded-xl bg-emerald-700 px-4 py-2 text-white">{successMessage}</div>}
    </main>
  );
}
