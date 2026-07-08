import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-emerald-50 px-4"><p className="font-black text-slate-950">Đang mở Tân Đô...</p></main>}>
      <LoginForm />
    </Suspense>
  );
}