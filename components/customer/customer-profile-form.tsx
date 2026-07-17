"use client";

import { useEffect, useMemo, useState } from "react";
import vietnamAdminUnitsData from "@/data/vietnam-admin-units.json";
import { supabaseBrowser } from "@/lib/supabase/client";

type VietnamWard = { code: string | number; name: string; province_code?: string | number };
type VietnamProvince = { code: string | number; name: string; wards: VietnamWard[] };

export type CustomerFormData = {
  name: string;
  phone: string;
  contactPerson: string;
  address: string;
  area: string;
  ward: string;
  district: string | null;
  province: string;
  provinceCode: string;
  wardCode: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
};

const emptyForm: CustomerFormData = {
  name: "",
  phone: "",
  contactPerson: "",
  address: "",
  area: "",
  ward: "",
  district: null,
  province: "",
  provinceCode: "",
  wardCode: "",
  note: "",
  latitude: null,
  longitude: null,
};

const vietnamAdminUnits = vietnamAdminUnitsData as VietnamProvince[];

export type CustomerApiRecord = {
  id?: string;
  auth_user_id?: string | null;
  name?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  address?: string | null;
  area?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  province_code?: string | number | null;
  ward_code?: string | number | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
};

export function mapCustomerApiToForm(customer: CustomerApiRecord | null | undefined): CustomerFormData | null {
  if (!customer) return null;
  return {
    name: (customer.name ?? "") as string,
    phone: (customer.phone ?? "") as string,
    contactPerson: (customer.contact_person ?? "") as string,
    address: (customer.address ?? "") as string,
    area: (customer.area ?? "") as string,
    ward: (customer.ward ?? "") as string,
    district: (customer.district ?? null) as string | null,
    province: (customer.province ?? "") as string,
    provinceCode: String(customer.province_code ?? ""),
    wardCode: String(customer.ward_code ?? ""),
    note: (customer.note ?? "") as string,
    latitude: typeof customer.latitude === "number" ? customer.latitude : null,
    longitude: typeof customer.longitude === "number" ? customer.longitude : null,
  };
}

export default function CustomerProfileForm({ initial, onSaved, onClose, submitLabel = "Lưu thay đổi" }: {
  initial?: Partial<CustomerFormData> | null;
  onSaved?: (data: CustomerApiRecord) => void;
  onClose?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<CustomerFormData>({ ...emptyForm, ...initial });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      ...emptyForm,
      ...(initial ?? {}),
    });
    setError(null);
    setLocationMessage(null);
  }, [initial]);

  const selectedProvince = useMemo(() => vietnamAdminUnits.find((p) => String(p.code) === form.provinceCode) ?? null, [form.provinceCode]);
  const wardOptions = selectedProvince?.wards ?? [];

  function updateField<K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  function selectProvince(nextProvinceCode: string) {
    const province = vietnamAdminUnits.find((item) => String(item.code) === nextProvinceCode) ?? null;
    setForm((current) => ({ ...current, provinceCode: nextProvinceCode, province: province?.name ?? "", wardCode: "", ward: "" }));
  }

  function selectWard(nextWardCode: string) {
    const ward = wardOptions.find((item) => String(item.code) === nextWardCode) ?? null;
    setForm((current) => ({ ...current, wardCode: nextWardCode, ward: ward?.name ?? "" }));
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
        const resp = await response.json().catch(() => null);
        // Handle unique phone constraint or 409
        if (response.status === 409 || (resp && typeof resp.error === "string" && resp.error.includes("customers_phone_unique"))) {
          setError("Số điện thoại này đã được đăng ký cho khách hàng khác.");
          return;
        }

        throw new Error(resp?.error ?? "Không lưu được thông tin quán.");
      }

      const saved = await response.json().catch(() => null);
      const apiCustomer = saved?.customer ?? saved;
      if (onSaved && apiCustomer && typeof apiCustomer === "object") {
        onSaved(apiCustomer as CustomerApiRecord);
      }
      if (onClose) onClose();
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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <div className="grid gap-3">
      <input className="w-full rounded-xl border p-3" placeholder="Tên quán" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
      <input className="w-full rounded-xl border p-3" placeholder="Số điện thoại" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
      <input className="w-full rounded-xl border p-3" placeholder="Người liên hệ" value={form.contactPerson} onChange={(e) => updateField("contactPerson", e.target.value)} />
      <input className="w-full rounded-xl border p-3" placeholder="Địa chỉ" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
      <input className="w-full rounded-xl border p-3" placeholder="Khu vực" value={form.area} onChange={(e) => updateField("area", e.target.value)} />
      <select className="w-full rounded-xl border p-3" value={form.provinceCode} onChange={(e) => selectProvince(e.target.value)}>
        <option value="">Chọn tỉnh/thành phố</option>
        {vietnamAdminUnits.map((province) => (
          <option key={String(province.code)} value={String(province.code)}>
            {province.name}
          </option>
        ))}
      </select>
      <select className="w-full rounded-xl border p-3" value={form.wardCode} onChange={(e) => selectWard(e.target.value)} disabled={!form.provinceCode}>
        <option value="">{form.provinceCode ? "Chọn xã/phường/đặc khu" : "Chọn tỉnh/thành phố trước"}</option>
        {wardOptions.map((ward) => (
          <option key={String(ward.code)} value={String(ward.code)}>
            {ward.name}
          </option>
        ))}
      </select>
      <input className="w-full rounded-xl border p-3" placeholder="Ghi chú" value={form.note} onChange={(e) => updateField("note", e.target.value)} />
      {error && <p className="mt-1 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {locationMessage && <p className="mt-1 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{locationMessage}</p>}
      <button type="button" disabled={locating} className="mt-1 w-full rounded-xl bg-slate-100 p-3 disabled:cursor-not-allowed disabled:opacity-70" onClick={getCurrentLocation}>
        {locating ? "Đang lấy vị trí..." : "Lấy vị trí hiện tại"}
      </button>
      <div className="mt-2 grid gap-2">
        <button type="button" disabled={loading} onClick={save} className="w-full rounded-xl bg-emerald-700 p-3 font-black text-white disabled:opacity-70">{loading ? "Đang lưu..." : submitLabel}</button>
        {onClose && <button type="button" onClick={onClose} className="w-full rounded-xl border p-3">Hủy</button>}
      </div>
    </div>
  );
}
