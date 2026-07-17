"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type CustomerSetupForm = {
  name: string;
  phone: string;
  contactPerson: string;
  address: string;
  area: string;
  ward: string;
  district: string;
  province: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
};

const emptyForm: CustomerSetupForm = {
  name: "",
  phone: "",
  contactPerson: "",
  address: "",
  area: "",
  ward: "",
  district: "",
  province: "",
  note: "",
  latitude: null,
  longitude: null,
};

export default function CustomerSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerSetupForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CustomerSetupForm>(key: K, value: CustomerSetupForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!supabaseBrowser) {
      setError("Thiết lập đang không khả dụng lúc này.");
      return;
    }

    const { data } = await supabaseBrowser.auth.getSession();
    if (!data.session?.access_token) {
      setError("Bạn cần đăng nhập trước khi lưu thông tin quán.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      contactPerson: form.contactPerson.trim(),
      address: form.address.trim(),
      area: form.area.trim(),
      ward: form.ward.trim(),
      district: form.district.trim(),
      province: form.province.trim(),
      note: form.note.trim(),
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
    };

    const response = await fetch("/api/customer/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Không lưu được thông tin quán.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace("/customer");
  }

  return (
    <main className="phone-page p-4">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-5">
        <h1 className="text-xl font-black">Thiết lập thông tin quán</h1>
        <div className="mt-3 grid gap-3">
          <input className="w-full rounded-xl border p-3" placeholder="Tên quán" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Số điện thoại" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Người liên hệ" value={form.contactPerson} onChange={(event) => updateField("contactPerson", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Địa chỉ" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Khu vực" value={form.area} onChange={(event) => updateField("area", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Phường/Xã" value={form.ward} onChange={(event) => updateField("ward", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Quận/Huyện" value={form.district} onChange={(event) => updateField("district", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Tỉnh/Thành" value={form.province} onChange={(event) => updateField("province", event.target.value)} />
          <input className="w-full rounded-xl border p-3" placeholder="Ghi chú" value={form.note} onChange={(event) => updateField("note", event.target.value)} />
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <button
          type="button"
          className="mt-3 w-full rounded-xl bg-slate-100 p-3"
          onClick={() => navigator.geolocation.getCurrentPosition(
            (position) => {
              updateField("latitude", position.coords.latitude);
              updateField("longitude", position.coords.longitude);
            },
            () => setError("Không lấy được vị trí hiện tại. Bạn có thể bỏ qua bước này."),
          )}
        >
          Lấy vị trí hiện tại
        </button>
        <button type="button" disabled={loading} className="mt-3 w-full rounded-xl bg-emerald-700 p-3 font-black text-white disabled:bg-slate-300" onClick={save}>
          {loading ? "Đang lưu..." : "Lưu thông tin"}
        </button>
      </section>
    </main>
  );
}
