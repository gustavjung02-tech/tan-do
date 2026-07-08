"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { supabaseBrowser } from "@/lib/supabase/client";

type Tab = "customer" | "sales";
type CustomerMode = "login" | "signup";

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabaseBrowser) return {};
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "customer");
  const [customerMode, setCustomerMode] = useState<CustomerMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createCustomerProfile() {
    const headers = await authHeaders();
    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ fullName, phone }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? "Không tạo được hồ sơ khách.");
    }
  }

  async function login() {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!supabaseBrowser) {
      setError("Chưa cấu hình Supabase Auth.");
      setLoading(false);
      return;
    }

    try {
      if (tab === "customer" && customerMode === "signup") {
        if (!fullName.trim()) throw new Error("Anh nhập tên quán/tên khách trước đã.");
        if (!phone.trim()) throw new Error("Anh nhập số điện thoại để sales liên hệ khi cần.");

        const { error: signupError } = await supabaseBrowser.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              role: "customer",
            },
          },
        });

        if (signupError) throw new Error(signupError.message);

        const { data: signupSession } = await supabaseBrowser.auth.getSession();
        if (!signupSession.session) {
          setMessage("Tài khoản đã tạo. Anh cần xác nhận email trước khi tạo hồ sơ khách.");
          return;
        }

        await createCustomerProfile();
        await refreshProfile();
        router.replace("/customer");
        return;
      }

      const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) throw new Error("Email hoặc mật khẩu không đúng.");
      await refreshProfile();

      const next = searchParams.get("next");
      if (tab === "sales") {
        router.replace(next || "/sales");
      } else {
        router.replace(next || "/customer");
      }
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Không đăng nhập được.";
      setError(text);
    } finally {
      setLoading(false);
    }
  }

  const isCustomerSignup = tab === "customer" && customerMode === "signup";

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white px-4 py-7">
      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-between rounded-[2rem] bg-white/90 p-5 card-shadow ring-1 ring-emerald-100 backdrop-blur">
        <div>
          <div className="text-center">
            <img src="/icons/tando-logo.png" alt="Tân Đô F&B" className="mx-auto h-24 w-24 rounded-3xl object-cover shadow-sm" />
            <h1 className="mt-4 text-2xl font-black text-slate-950">Tân Đô F&B</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Đặt hàng, xem lại đơn và xử lý đơn nội bộ trên một app nhẹ.</p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-3xl bg-emerald-50 p-1 ring-1 ring-emerald-100">
            <button onClick={() => { setTab("customer"); setError(null); }} className={`rounded-[1.35rem] px-4 py-3 text-sm font-black transition ${tab === "customer" ? "bg-emerald-700 text-white shadow-sm" : "text-emerald-800"}`}>Khách/quán</button>
            <button onClick={() => { setTab("sales"); setCustomerMode("login"); setError(null); }} className={`rounded-[1.35rem] px-4 py-3 text-sm font-black transition ${tab === "sales" ? "bg-emerald-700 text-white shadow-sm" : "text-emerald-800"}`}>Sales</button>
          </div>

          <section className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-slate-100">
            <div className="mb-5">
              <p className="text-lg font-black text-slate-950">{tab === "sales" ? "Đăng nhập sales" : customerMode === "signup" ? "Tạo tài khoản khách" : "Đăng nhập khách"}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {tab === "sales" ? "Chỉ tài khoản sales/admin được vào khu vực xử lý đơn." : "Khách dùng email để lưu lịch sử đơn và nhận thông báo trạng thái."}
              </p>
            </div>

            {tab === "customer" && (
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
                <button onClick={() => setCustomerMode("login")} className={`rounded-xl px-3 py-2 text-xs font-black ${customerMode === "login" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>Đăng nhập</button>
                <button onClick={() => setCustomerMode("signup")} className={`rounded-xl px-3 py-2 text-xs font-black ${customerMode === "signup" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>Đăng ký</button>
              </div>
            )}

            <div className="grid gap-4">
              {isCustomerSignup && (
                <>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Tên quán / tên khách
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-700" placeholder="VD: Quán Trà Sữa An An" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Số điện thoại
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-700" placeholder="090..." />
                  </label>
                </>
              )}
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-700" placeholder={tab === "sales" ? "sales@tando.vn" : "quan@example.com"} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Mật khẩu
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-700" placeholder="••••••••" />
              </label>
            </div>

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">{message}</p>}

            <button disabled={loading} onClick={login} className="mt-5 w-full rounded-2xl bg-emerald-700 px-4 py-4 font-black text-white shadow-sm disabled:bg-slate-300">
              {loading ? "Đang xử lý..." : tab === "sales" ? "Vào sales" : customerMode === "signup" ? "Tạo tài khoản và vào đặt hàng" : "Vào đặt hàng"}
            </button>
          </section>
        </div>

        <div className="mt-6 text-center text-xs font-bold leading-5 text-slate-400">
          Khách và sales dùng chung app, nhưng dữ liệu và quyền truy cập được tách riêng.
        </div>
      </section>
    </main>
  );
}