"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resolvePostLoginDestination } from "@/lib/auth/client-redirect";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function finish() {
      if (!supabaseBrowser) {
        if (isActive) {
          setError("Không thể khởi tạo xác thực.");
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const authError = params.get("error");
      const authErrorDescription = params.get("error_description");

      if (authError || authErrorDescription) {
        const message = authErrorDescription || authError || "Đăng nhập Google bị hủy.";
        if (isActive) {
          setError(message);
        }
        window.setTimeout(() => router.replace("/login"), 1600);
        return;
      }

      const code = params.get("code");
      if (!code) {
        if (isActive) {
          setError("Thiếu mã xác thực Google.");
        }
        window.setTimeout(() => router.replace("/login"), 1600);
        return;
      }

      try {
        const { error: exchangeError } = await supabaseBrowser.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          throw exchangeError;
        }

        const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
          throw new Error(sessionError?.message || "Không nhận được phiên đăng nhập.");
        }

        const session = sessionData.session;
        const profileResponse = await fetch("/api/auth/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            fullName: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? session.user.email ?? "",
            phone: session.user.user_metadata?.phone ?? "",
          }),
        });

        if (!profileResponse.ok) {
          const payload = await profileResponse.json().catch(() => ({}));
          throw new Error(payload?.error || "Không tạo được hồ sơ người dùng.");
        }

        const destination = await resolvePostLoginDestination({
          accessToken: session.access_token,
          next: params.get("next"),
        });

        if (isActive) {
          router.replace(destination);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Đăng nhập Google thất bại.");
          window.setTimeout(() => router.replace("/login"), 1600);
        }
      }
    }

    void finish();
    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-4">
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-lg font-black text-slate-950">Đăng nhập Google thất bại</p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-black text-slate-950">Đang đăng nhập Google...</p>
            <p className="mt-2 text-sm text-slate-600">Vui lòng đợi trong giây lát.</p>
          </>
        )}
      </div>
    </main>
  );
}
