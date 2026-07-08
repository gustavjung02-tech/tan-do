"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function CustomerGate({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      const query = searchParams.toString();
      const next = `${pathname}${query ? `?${query}` : ""}`;
      router.replace(`/login?tab=customer&next=${encodeURIComponent(next)}`);
    }
  }, [loading, session, pathname, router, searchParams]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-emerald-50 px-4">
        <div className="rounded-3xl bg-white p-6 text-center card-shadow ring-1 ring-emerald-100">
          <p className="font-black text-slate-950">Đang kiểm tra tài khoản...</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Khách cần đăng nhập để lưu lịch sử đơn.</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-emerald-50 px-4">
        <div className="rounded-3xl bg-white p-6 text-center card-shadow ring-1 ring-emerald-100">
          <p className="text-xl font-black text-slate-950">Chưa có hồ sơ khách</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Anh đăng ký lại ở tab Khách/quán để tạo hồ sơ trước khi đặt hàng.</p>
          <Link href="/login?tab=customer" className="mt-5 block rounded-2xl bg-emerald-700 px-4 py-4 font-black text-white">Về đăng nhập</Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
