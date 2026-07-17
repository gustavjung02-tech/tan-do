"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import vietnamAdminUnitsData from "@/data/vietnam-admin-units.json";

type VietnamWard = {
  code: string | number;
  name: string;
  province_code?: string | number;
};

type VietnamProvince = {
  code: string | number;
  name: string;
  wards: VietnamWard[];
};

type CustomerSetupForm = {
  name: string;
  phone: string;
  contactPerson: string;
  address: string;
  area: string;
  ward: string;
  district: string;
  province: string;
  provinceCode: string;
  wardCode: string;
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
  provinceCode: "",
  wardCode: "",
  note: "",
  latitude: null,
  longitude: null,
};

const vietnamAdminUnits = vietnamAdminUnitsData as VietnamProvince[];

export default function CustomerSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerSetupForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const selectedProvince = useMemo(
    () => vietnamAdminUnits.find((province) => String(province.code) === form.provinceCode) ?? null,
    [form.provinceCode],
  );

  const wardOptions = selectedProvince?.wards ?? [];

  function updateField<K extends keyof CustomerSetupForm>(key: K, value: CustomerSetupForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectProvince(nextProvinceCode: string) {
    const province = vietnamAdminUnits.find((item) => String(item.code) === nextProvinceCode) ?? null;
    setForm((current) => ({
      ...current,
      provinceCode: nextProvinceCode,
      province: province?.name ?? "",
      wardCode: "",
      ward: "",
    }));
  }

  function selectWard(nextWardCode: string) {
    const ward = wardOptions.find((item) => String(item.code) === nextWardCode) ?? null;
    setForm((current) => ({
      ...current,
      wardCode: nextWardCode,
      ward: ward?.name ?? "",
    }));
  }

  async function save() {
    if (!supabaseBrowser) {
      setError("Thiết lập đang không khả dụng lúc này.");
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedAddress = form.address.trim();

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      setError("Tên quán, số điện thoại và địa chỉ chi tiết là bắt buộc.");
      return;
    }

    if (!form.provinceCode || !form.wardCode) {
      setError("Vui lòng chọn Tỉnh/Thành phố và Xã/Phường/Đặc khu.");
      return;
    }

    const { data } = await supabaseBrowser.auth.getSession();
    if (!data.session?.access_token) {
      setError("Bạn cần đăng nhập trước khi lưu thông tin quán.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        contactPerson: form.contactPerson.trim(),
        address: trimmedAddress,
        area: form.area.trim(),
        ward: form.ward.trim(),
        district: null,
        province: form.province.trim(),
        provinceCode: form.provinceCode,
        wardCode: form.wardCode,
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
        throw new Error(data?.error ?? "Không lưu được thông tin quán.");
      }

      router.replace("/customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được thông tin quán.");
    } finally {
      setLoading(false);
    }
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Thiết bị này không hỗ trợ định vị.");
      return;
    }

    setLocating(true);
    setError(null);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField("latitude", position.coords.latitude);
        updateField("longitude", position.coords.longitude);
        setLocationMessage(`Đã lấy vị trí: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      (positionError) => {
        let message = "Không lấy được vị trí hiện tại.";
        if (positionError.code === 1) {
          message = "Bạn đã từ chối cấp quyền vị trí. Vui lòng bật quyền định vị trong trình duyệt.";
        } else if (positionError.code === 2) {
          message = "Thiết bị không xác định được vị trí hiện tại.";
        } else if (positionError.code === 3) {
          message = "Hết thời gian lấy vị trí. Vui lòng thử lại.";
        }
        setError(message);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
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
          <select className="w-full rounded-xl border p-3" value={form.provinceCode} onChange={(event) => selectProvince(event.target.value)}>
            <option value="">Chọn tỉnh/thành phố</option>
            {vietnamAdminUnits.map((province) => (
              <option key={String(province.code)} value={String(province.code)}>
                {province.name}
              </option>
            ))}
          </select>
          <select className="w-full rounded-xl border p-3" value={form.wardCode} onChange={(event) => selectWard(event.target.value)} disabled={!form.provinceCode}>
            <option value="">{form.provinceCode ? "Chọn xã/phường/đặc khu" : "Chọn tỉnh/thành phố trước"}</option>
            {wardOptions.map((ward) => (
              <option key={String(ward.code)} value={String(ward.code)}>
                {ward.name}
              </option>
            ))}
          </select>
          <input className="w-full rounded-xl border p-3" placeholder="Ghi chú" value={form.note} onChange={(event) => updateField("note", event.target.value)} />
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {locationMessage && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{locationMessage}</p>}
        <button type="button" disabled={locating} className="mt-3 w-full rounded-xl bg-slate-100 p-3 disabled:cursor-not-allowed disabled:opacity-70" onClick={getCurrentLocation}>
          {locating ? "Đang lấy vị trí..." : "Lấy vị trí hiện tại"}
        </button>
        <button type="button" disabled={loading} className="mt-3 w-full rounded-xl bg-emerald-700 p-3 font-black text-white disabled:bg-slate-300" onClick={save}>
          {loading ? "Đang lưu..." : "Lưu thông tin"}
        </button>
      </section>
    </main>
  );
}
