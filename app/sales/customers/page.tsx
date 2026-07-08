"use client";

import { useEffect, useMemo, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import type { Customer } from "@/lib/services/customers";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";

type CustomerForm = {
  customerCode: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  ward: string;
  district: string;
  province: string;
  contactPerson: string;
  note: string;
  latitude: string;
  longitude: string;
};

const emptyForm: CustomerForm = {
  customerCode: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  area: "",
  ward: "",
  district: "",
  province: "",
  contactPerson: "",
  note: "",
  latitude: "",
  longitude: "",
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabaseBrowser) return {};
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Có lỗi khi xử lý dữ liệu.");
  return payload as T;
}

export default function SalesCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedArea, setSelectedArea] = useState("Tất cả");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const areas = useMemo(() => {
    const values = customers.map((customer) => customer.area?.trim()).filter(Boolean) as string[];
    return ["Tất cả", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "vi"))];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchArea = selectedArea === "Tất cả" || customer.area === selectedArea;
      const matchKeyword = !keyword
        || customer.name.toLowerCase().includes(keyword)
        || customer.phone.toLowerCase().includes(keyword)
        || customer.customer_code?.toLowerCase().includes(keyword)
        || customer.address?.toLowerCase().includes(keyword)
        || customer.contact_person?.toLowerCase().includes(keyword);
      return matchArea && matchKeyword;
    });
  }, [customers, searchText, selectedArea]);

  async function loadCustomers() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<{ customers: Customer[] }>("/api/customers");
      setCustomers(result.customers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được danh sách khách.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function saveCustomer() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Cần nhập tên khách và số điện thoại.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await fetchJson<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Đã lưu khách hàng.");
      setForm(emptyForm);
      setFormOpen(false);
      await loadCustomers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được khách hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(file: File | null) {
    if (!file) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          ...authHeaders,
        },
        body: text,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Không import được file khách.");
      setMessage(`Đã import ${payload.imported} khách. Bỏ qua ${payload.skipped ?? 0} dòng không hợp lệ.`);
      setImportOpen(false);
      await loadCustomers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không import được file khách.");
    } finally {
      setSaving(false);
    }
  }

  const csvExample = "customer_code,name,phone,email,address,area,ward,district,province,contact_person,note,latitude,longitude\nKH001,Quán Trà Sữa An An,0901234567,anan@gmail.com,12 Nguyễn Trãi,Khu A,Phường 1,Quận 5,TP.HCM,Chị An,Giao buổi sáng,10.7551,106.6678";

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
          <h1 className="text-xl font-black text-slate-950">Khách hàng</h1>
          <button onClick={() => setImportOpen((value) => !value)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Import</button>
          <button onClick={() => setFormOpen((value) => !value)} className="rounded-2xl bg-blue-700 px-3 py-2 text-xs font-black text-white">Thêm</button>
        </header>

        <section className="mt-5 rounded-3xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-700" placeholder="Tìm tên, SĐT, mã khách, địa chỉ..." />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-blue-700">
              {areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
            <button onClick={() => void loadCustomers()} disabled={loading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300">{loading ? "Đang tải" : "Tải lại"}</button>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">Đang hiển thị {filteredCustomers.length}/{customers.length} khách.</p>
        </section>

        {formOpen && (
          <section className="mt-4 rounded-3xl bg-white p-4 card-shadow ring-1 ring-blue-100">
            <h2 className="font-black text-slate-950">Thêm khách nhanh</h2>
            <div className="mt-3 grid gap-3">
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Tên khách / tên quán *" />
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Số điện thoại *" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.customerCode} onChange={(event) => setForm((current) => ({ ...current, customerCode: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Mã khách" />
                <input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Khu vực" />
              </div>
              <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Địa chỉ" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.ward} onChange={(event) => setForm((current) => ({ ...current, ward: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Phường/xã" />
                <input value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Quận/huyện" />
              </div>
              <input value={form.contactPerson} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Người liên hệ" />
              <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className="min-h-16 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Ghi chú" />
            </div>
            <button disabled={saving} onClick={() => void saveCustomer()} className="mt-4 w-full rounded-2xl bg-blue-700 px-4 py-4 font-black text-white disabled:bg-slate-300">{saving ? "Đang lưu..." : "Lưu khách"}</button>
          </section>
        )}

        {importOpen && (
          <section className="mt-4 rounded-3xl bg-white p-4 card-shadow ring-1 ring-amber-100">
            <h2 className="font-black text-slate-950">Import khách bằng CSV</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Excel hãy lưu dạng CSV UTF-8 rồi chọn file ở đây. Cột bắt buộc: name, phone.</p>
            <input type="file" accept=".csv,text/csv" disabled={saving} onChange={(event) => void importCsv(event.target.files?.[0] ?? null)} className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm" />
            <details className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              <summary className="cursor-pointer font-black text-slate-800">Cấu trúc file mẫu</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap leading-5">{csvExample}</pre>
            </details>
          </section>
        )}

        {message && <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700 ring-1 ring-green-100">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

        <section className="mt-4 grid gap-3">
          {loading ? (
            <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Đang tải khách hàng...</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Chưa có khách hàng trong danh bạ.</p>
          ) : filteredCustomers.map((customer) => (
            <article key={customer.id} className="rounded-3xl bg-white p-4 card-shadow ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 font-black text-slate-950">{customer.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{customer.phone}</p>
                  <p className="mt-1 text-xs font-bold text-blue-700">{customer.customer_code || "Chưa có mã"} · {customer.area || "Chưa có khu vực"}</p>
                </div>
                <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">{customer.order_count ?? 0} đơn</p>
              </div>
              {customer.address && <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{customer.address}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-bold text-slate-400">Tổng mua</p>
                  <p className="mt-1 font-black text-blue-700">{formatMoney(customer.total_spent ?? 0)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-bold text-slate-400">Liên hệ</p>
                  <p className="mt-1 truncate font-black text-slate-700">{customer.contact_person || "Chưa có"}</p>
                </div>
              </div>
              {(customer.latitude && customer.longitude) && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`} target="_blank" rel="noreferrer" className="mt-3 block rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">Mở bản đồ</a>
              )}
            </article>
          ))}
        </section>
      </section>
      <SalesBottomNav />
    </main>
  );
}
