"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { InstallAppButton } from "@/components/ui/install-app-button";

type Tab = "customer" | "sales";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loginWithGoogle() {
    if (!supabaseBrowser) return;
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function login() {
    if (!supabaseBrowser) return;
    setLoading(true);
    setError(null);
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email hoặc mật khẩu không đúng.");
      setLoading(false);
      return;
    }
    await refreshProfile();
    router.replace(params.get("next") || (tab === "sales" ? "/sales" : "/customer"));
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-white px-4 py-7">
      <section className="mx-auto max-w-md rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="text-center">
          <img src="/icons/tando-logo.png" alt="Tân Đô F&B" className="mx-auto h-24 w-24 rounded-3xl" />
          <h1 className="mt-4 text-2xl font-black">Tân Đô F&B</h1>
          <p className="mt-2 text-sm text-slate-500">Đặt hàng và quản lý đơn hàng dễ dàng.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-emerald-50 p-1">
          <button type="button" onClick={() => setTab("customer")} className={`rounded-xl px-3 py-2 font-black ${tab === "customer" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}>
            Khách hàng
          </button>
          <button type="button" onClick={() => setTab("sales")} className={`rounded-xl px-3 py-2 font-black ${tab === "sales" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}>
            Sales
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="rounded-xl border px-4 py-3" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" className="rounded-xl border px-4 py-3" />
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {tab === "customer" && <button type="button" onClick={loginWithGoogle} className="rounded-2xl border px-4 py-3 font-black">Tiếp tục với Google</button>}
          <button type="button" disabled={loading} onClick={login} className="rounded-2xl bg-emerald-700 px-4 py-3 font-black text-white">{loading ? "Đang xử lý..." : "Đăng nhập"}</button>
        </div>
        <InstallAppButton />
      </section>
    </main>
  );
}
