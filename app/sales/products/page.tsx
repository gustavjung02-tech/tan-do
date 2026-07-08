"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { formatMoney } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";

type ProductForm = {
  name: string;
  sku: string;
  price: string;
  unit: string;
  imageUrl: string;
  brand: string;
  category: string;
  isActive: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number | string;
  unit: string;
  image_url: string | null;
  brand: string | null;
  category: string | null;
  is_active: boolean;
};

const ALL_CATEGORIES = "Tất cả";

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  price: "0",
  unit: "cái",
  imageUrl: "",
  brand: "",
  category: "",
  isActive: true,
};

function toForm(product: ProductRow): ProductForm {
  return {
    name: product.name,
    sku: product.sku ?? "",
    price: String(product.price),
    unit: product.unit,
    imageUrl: product.image_url ?? "",
    brand: product.brand ?? "",
    category: product.category ?? "",
    isActive: product.is_active,
  };
}

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

export default function SalesProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "hidden">("all");
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);

  const activeCount = useMemo(() => products.filter((product) => product.is_active).length, [products]);

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category?.trim())
      .filter(Boolean) as string[];
    return [ALL_CATEGORIES, ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "vi"))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory = selectedCategory === ALL_CATEGORIES || product.category === selectedCategory;
      const matchStatus = selectedStatus === "all" || (selectedStatus === "active" ? product.is_active : !product.is_active);
      const matchKeyword = !keyword
        || product.name.toLowerCase().includes(keyword)
        || (product.sku ?? "").toLowerCase().includes(keyword)
        || (product.brand ?? "").toLowerCase().includes(keyword)
        || (product.category ?? "").toLowerCase().includes(keyword);
      return matchCategory && matchStatus && matchKeyword;
    });
  }, [products, searchText, selectedCategory, selectedStatus]);

  const displayedProducts = filteredProducts.slice(0, visibleLimit);
  const hasFilter = Boolean(searchText || selectedCategory !== ALL_CATEGORIES || selectedStatus !== "all");

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<{ products: ProductRow[] }>("/api/products");
      setProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function startEdit(product: ProductRow) {
    setEditingId(product.id);
    setForm(toForm(product));
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setSearchText("");
    setSelectedCategory(ALL_CATEGORIES);
    setSelectedStatus("all");
    setVisibleLimit(50);
    setCategoryPanelOpen(false);
    setStatusPanelOpen(false);
  }

  async function saveProduct() {
    if (!form.name.trim()) {
      setError("Cần nhập tên sản phẩm.");
      return;
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError("Giá bán không hợp lệ.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const body = {
      name: form.name,
      sku: form.sku,
      price,
      unit: form.unit || "cái",
      imageUrl: form.imageUrl,
      brand: form.brand,
      category: form.category,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await fetchJson<{ product: ProductRow }>(`/api/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMessage("Đã cập nhật sản phẩm.");
      } else {
        await fetchJson<{ product: ProductRow }>("/api/products", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("Đã thêm sản phẩm mới.");
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được sản phẩm.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: ProductRow) {
    setMessage(null);
    setError(null);
    try {
      await fetchJson<{ product: ProductRow }>(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !product.is_active }),
      });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được trạng thái sản phẩm.");
    }
  }

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/sales" className="text-2xl text-slate-900">←</Link>
          <h1 className="text-center text-lg font-black text-slate-950">Sản phẩm</h1>
          <button onClick={startCreate} className="text-sm font-black text-blue-700">Mới</button>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
            <p className="text-xs font-semibold text-slate-500">Tổng</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{products.length}</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3 text-center text-green-700 ring-1 ring-green-100">
            <p className="text-xs font-semibold">Còn bán</p>
            <p className="mt-1 text-2xl font-black">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 text-center text-slate-600 ring-1 ring-slate-200">
            <p className="text-xs font-semibold">Tạm ẩn</p>
            <p className="mt-1 text-2xl font-black">{products.length - activeCount}</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-slate-950">{editingId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
            {editingId && <button onClick={startCreate} className="text-sm font-bold text-slate-500">Hủy sửa</button>}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Tên sản phẩm<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Ví dụ: Thạch 3Q Bibi" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Mã sản phẩm<input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Thương hiệu<input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" /></label>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Nhóm hàng<input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Ví dụ: 3Q Gion, TRÀ CÁC LOẠI" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Giá bán<input type="number" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Đơn vị<input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="cái/thùng/gói" /></label>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Link ảnh<input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="https://..." /></label>
            <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">Còn bán<input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-5 w-5" /></label>
          </div>

          {message && <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700 ring-1 ring-green-100">{message}</p>}
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

          <button disabled={saving} onClick={() => void saveProduct()} className="mt-5 w-full rounded-xl bg-blue-700 py-4 font-black text-white disabled:bg-slate-300">{saving ? "Đang lưu..." : editingId ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}</button>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Tìm và lọc</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Đang hiển thị {filteredProducts.length}/{products.length} sản phẩm</p>
              <p className="mt-1 text-xs font-bold text-blue-700">Nhóm: {selectedCategory} · Trạng thái: {selectedStatus === "all" ? "Tất cả" : selectedStatus === "active" ? "Còn bán" : "Tạm ẩn"}</p>
            </div>
            {hasFilter && <button onClick={clearFilters} className="text-sm font-black text-blue-700">Xóa lọc</button>}
          </div>

          <input value={searchText} onChange={(event) => { setSearchText(event.target.value); setVisibleLimit(50); }} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-700" placeholder="Tìm tên, mã, thương hiệu..." />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => { setCategoryPanelOpen((value) => !value); setStatusPanelOpen(false); }} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">{categoryPanelOpen ? "Đóng nhóm" : "Nhóm hàng"}</button>
            <button onClick={() => { setStatusPanelOpen((value) => !value); setCategoryPanelOpen(false); }} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{statusPanelOpen ? "Đóng trạng thái" : "Trạng thái"}</button>
          </div>

          {categoryPanelOpen && (
            <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
              {categories.map((category) => (
                <button key={category} onClick={() => { setSelectedCategory(category); setVisibleLimit(50); setCategoryPanelOpen(false); }} className={selectedCategory === category ? "rounded-xl bg-blue-700 px-3 py-3 text-left text-sm font-black text-white" : "rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>{category}</button>
              ))}
            </div>
          )}

          {statusPanelOpen && (
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
              {[["all", "Tất cả"], ["active", "Còn bán"], ["hidden", "Tạm ẩn"]].map(([value, label]) => (
                <button key={value} onClick={() => { setSelectedStatus(value as "all" | "active" | "hidden"); setVisibleLimit(50); setStatusPanelOpen(false); }} className={selectedStatus === value ? "rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white" : "rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>{label}</button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-950">Danh sách sản phẩm</h2>
            <button onClick={() => void loadProducts()} disabled={loading} className="text-sm font-bold text-blue-700 disabled:opacity-50">{loading ? "Đang tải" : "Tải lại"}</button>
          </div>

          <div className="mt-3 grid gap-3">
            {loading ? <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Đang tải sản phẩm...</p> : filteredProducts.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Không có sản phẩm phù hợp.</p> : displayedProducts.map((product) => (
              <article key={product.id} className="rounded-2xl bg-white p-3 card-shadow ring-1 ring-slate-100">
                <div className="grid grid-cols-[58px_1fr] gap-3">
                  {product.image_url ? <img src={product.image_url} alt={product.name} className="h-16 w-14 rounded-xl object-cover" loading="lazy" /> : <div className="grid h-16 w-14 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">Ảnh</div>}
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-950">{product.name}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">{product.category || "Chưa phân nhóm"}</p>
                        <p className="mt-1 text-xs text-slate-400">{product.sku || "Chưa có mã"} · {product.unit}</p>
                      </div>
                      <span className={product.is_active ? "rounded-lg bg-green-50 px-2 py-1 text-xs font-black text-green-700" : "rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500"}>{product.is_active ? "Còn bán" : "Tạm ẩn"}</span>
                    </div>
                    <p className="mt-2 font-black text-blue-700">{formatMoney(Number(product.price))}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => startEdit(product)} className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">Sửa</button>
                  <button onClick={() => void toggleActive(product)} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{product.is_active ? "Tạm ẩn" : "Bật bán"}</button>
                </div>
              </article>
            ))}
            {visibleLimit < filteredProducts.length && <button onClick={() => setVisibleLimit((current) => current + 50)} className="rounded-2xl bg-white px-4 py-4 font-black text-blue-700 ring-1 ring-blue-100">Xem thêm sản phẩm</button>}
          </div>
        </section>
      </section>
      <SalesBottomNav />
    </main>
  );
}
