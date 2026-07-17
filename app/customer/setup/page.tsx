"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import CustomerProfileForm, { mapCustomerApiToForm, CustomerApiRecord, type CustomerFormData } from "@/components/customer/customer-profile-form";

export default function CustomerSetupPage() {
  const router = useRouter();
  const [initial, setInitial] = useState<CustomerFormData | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!supabaseBrowser) return;
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session?.access_token) return;
      const res = await fetch("/api/customer/profile", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!res.ok) return;
      const payload = await res.json().catch(() => null);
      if (!mounted) return;
      const apiCustomer = payload?.customer as CustomerApiRecord | null | undefined;
      const mapped = mapCustomerApiToForm(apiCustomer ?? null);
      setInitial(mapped ?? null);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="phone-page p-4">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-5">
        <h1 className="text-xl font-black">Thiết lập thông tin quán</h1>
        <div className="mt-3">
          <CustomerProfileForm
            initial={initial ?? undefined}
            submitLabel="Lưu thông tin"
            onSaved={() => {
              router.replace("/customer");
            }}
          />
        </div>
      </section>
    </main>
  );
}
