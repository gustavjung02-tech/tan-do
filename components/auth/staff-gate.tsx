"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function StaffGate({ children }: { children: React.ReactNode }) {
  const { loading, session, profile, isStaff } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      const query = searchParams.toString();
      const next = `${pathname}${query ? `?${query}` : ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, session, pathname, router, searchParams]);

  if (loading || !session) {
    return (
      <main className="phone-page grid min-h-screen place-items-center px-4">
        <div className="rounded-3xl bg-white p-6 text-center card-shadow ring-1 ring-slate-100">
          <p className="font-black text-slate-950">Đang kiểm tra đăng nhập...</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Khu vực sales cần tài khoản được cấp quyền.</p>
        </div>
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main className="phone-page grid min-h-screen place-items-center px-4">
        <div className="rounded-3xl bg-white p-6 text-center card-shadow ring-1 ring-slate-100">
          <p className="text-xl font-black text-slate-950">Không có quyền sales</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Tài khoản hiện tại là {profile?.role ?? "chưa rõ quyền"}. Khu vực này chỉ dành cho sales.
          </p>
          <Link href="/customer" className="mt-5 block rounded-2xl bg-blue-700 px-4 py-4 font-black text-white">Về trang khách</Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
