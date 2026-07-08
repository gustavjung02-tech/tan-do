"use client";

import { Suspense } from "react";
import { CustomerGate } from "@/components/auth/customer-gate";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-emerald-50 px-4"><p className="font-black text-slate-950">Đang mở khu khách...</p></main>}>
      <CustomerGate>{children}</CustomerGate>
    </Suspense>
  );
}