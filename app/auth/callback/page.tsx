"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finish() {
      if (!supabaseBrowser) return;
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabaseBrowser.auth.exchangeCodeForSession(code);
      }
      const { data } = await supabaseBrowser.auth.getSession();
      if (data.session) {
        await fetch("/api/auth/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            fullName: data.session.user.user_metadata?.full_name || data.session.user.email,
            phone: data.session.user.user_metadata?.phone || "",
          }),
        });
      }
      const session = data.session;
      if (!session) { router.replace("/login"); return; }
      const profileResponse = await fetch("/api/customer/profile", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const profileData = await profileResponse.json().catch(() => ({}));
      const customer = profileData.customer;
      if (!customer?.name || !customer?.phone || !customer?.address) {
        router.replace("/customer/setup");
      } else {
        router.replace("/customer");
      }
    }
    void finish();
  }, [router]);

  return <main className="grid min-h-screen place-items-center">Đang đăng nhập Google...</main>;
}
