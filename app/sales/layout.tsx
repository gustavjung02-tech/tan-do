"use client";

import { Suspense } from "react";
import { StaffGate } from "@/components/auth/staff-gate";

function StaffFallback() {
  return (
    <main className="phone-page grid min-h-screen place-items-center px-4">
      <div className="rounded-3xl bg-white p-6 text-center card-shadow ring-1 ring-slate-100">
        <p className="font-black text-slate-950">Đang mở khu vực sales...</p>
      </div>
    </main>
  );
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<StaffFallback />}>
      <StaffGate>{children}</StaffGate>
    </Suspense>
  );
}