"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { ProductOptionPicker, optionLabel, productNeedsOptions } from "@/components/ui/product-option-picker";
import type { CartItem, Product, SelectedProductOptions } from "@/lib/mock/types";
import type { Customer } from "@/lib/services/customers";
import { ALL_CATEGORIES, ALL_FAMILIES, categoryList, familyList, getProductFamily, productMatchesTaxonomy } from "@/lib/services/product-taxonomy";
import { useAppStore } from "@/lib/store/app-store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";

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

type QuickCustomerForm = {
  name: string;
  phone: string;
  address: string;
  area: string;
  ward: string;
  district: string;
  contactPerson: string;
  note: string;
  latitude: string;
  longitude: string;
};

const emptyQuickCustomer: QuickCustomerForm = {
  name: "",
  phone: "",
  address: "",
  area: "",
  ward: "",
  district: "",
  contactPerson: "",
  note: "",
  latitude: "",
  longitude: "",
};

export default function ManualOrderPage() {
  const { products, createManualOrder } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("Khách tạo nhanh");
  const [customerPhone, setCustomerPhone] = useState("0900000999");
  const [salesNote, setSalesNote] = useState("");
  const [manualItems, setManualItems] = useState<CartItem[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedFamily, setSelectedFamily] = useState(ALL_FAMILIES);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerArea, setCustomerArea] = useState("Tất cả");
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState<QuickCustomerForm>(emptyQuickCustomer);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [optionProduct, setOptionProduct] = useState<Product | null>(null);
  const submittingRef = useRef(false);

  const rows = manualItems
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item) => item.product);

  const total = useMemo(() => rows.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0), [rows]);
  const totalQuantity = rows.reduce((sum, item) => sum + item.quantity, 0);
  const families = useMemo(() => familyList(products), [products]);
  const categories = useMemo(() => categoryList(products, selectedFamily), [products, selectedFamily]);
  const customerAreas = useMemo(() => ["Tất cả", ...Array.from(new Set(customers.map((customer) => customer.area?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "vi"))], [customers]);

  const filteredCustomers = useMemo(() => {
    const keyword = customerSearchText.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchArea = customerArea === "Tất cả" || customer.area === customerArea;
      const matchKeyword = !keyword
        || customer.name.toLowerCase().includes(keyword)
        || customer.phone.toLowerCase().includes(keyword)
        || customer.customer_code?.toLowerCase().includes(keyword)
        || customer.address?.toLowerCase().includes(keyword)
        || customer.contact_person?.toLowerCase().includes(keyword);
      return matchArea && matchKeyword;
    });
  }, [customers, customerArea, customerSearchText]);

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return products.filter((product) => {
      const matchTaxonomy = productMatchesTaxonomy(product, selectedFamily, selectedCategory);
      const matchKeyword = !keyword
        || product.name.toLowerCase().includes(keyword)
        || product.sku.toLowerCase().includes(keyword)
        || product.brand?.toLowerCase().includes(keyword)
        || product.category?.toLowerCase().includes(keyword)
        || getProductFamily(product).toLowerCase().includes(keyword)
        || product.optionGroups?.some((group) => group.values.some((value) => value.toLowerCase().includes(keyword)));
      return matchTaxonomy && matchKeyword;
    });
  }, [products, searchText, selectedFamily, selectedCategory]);

  async function loadCustomers() {
    setCustomerLoading(true);
    setCustomerError(null);
    try {
      const result = await fetchJson<{ customers: Customer[] }>("/api/customers");
      setCustomers(result.customers);
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : "Không tải được danh sách khách.");
    } finally {
      setCustomerLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  function chooseCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerPickerOpen(false);
    setCustomerError(null);
    setSubmitError(null);
  }

  async function saveQuickCustomer() {
    if (!quickCustomer.name.trim() || !quickCustomer.phone.trim()) {
      setCustomerError("Cần nhập tên khách và số điện thoại.");
      return;
    }

    setCustomerLoading(true);
    setCustomerError(null);
    try {
      const result = await fetchJson<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: JSON.stringify(quickCustomer),
      });
      await loadCustomers();
      chooseCustomer(result.customer);
      setQuickCustomer(emptyQuickCustomer);
      setQuickCustomerOpen(false);
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : "Không lưu được khách hàng.");
    } finally {
      setCustomerLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setCustomerError("Thiết bị không hỗ trợ định vị.");
      return;
    }
    setCustomerLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setQuickCustomer((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setCustomerLoading(false);
      },
      () => {
        setCustomerError("Không lấy được vị trí. Anh kiểm tra quyền định vị của trình duyệt/PWA.");
        setCustomerLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function sameOptions(a?: SelectedProductOptions, b?: SelectedProductOptions) {
    const left = a ?? {};
    const right = b ?? {};
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
  }

  function addProduct(productId: string, options?: SelectedProductOptions) {
    setManualItems((current) => {
      const exists = current.find((item) => item.productId === productId && sameOptions(item.options, options));
      if (!exists) return [...current, { productId, quantity: 1, options }];
      return current.map((item) => item.productId === productId && sameOptions(item.options, options) ? { ...item, quantity: item.quantity + 1 } : item);
    });
    setCreatedCode(null);
    setSubmitError(null);
  }

  function startAddProduct(product: Product) {
    if (productNeedsOptions(product)) {
      setOptionProduct(product);
      return;
    }
    addProduct(product.id);
  }

  function confirmOptions(options: SelectedProductOptions) {
    if (!optionProduct) return;
    addProduct(optionProduct.id, options);
    setOptionProduct(null);
  }

  function decreaseProduct(productId: string, options?: SelectedProductOptions) {
    setManualItems((current) => current.map((item) => item.productId === productId && sameOptions(item.options, options) ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0));
    setCreatedCode(null);
  }

  function removeProduct(productId: string, options?: SelectedProductOptions) {
    setManualItems((current) => current.filter((item) => !(item.productId === productId && sameOptions(item.options, options))));
    setCreatedCode(null);
  }

  function clearProductFilters() {
    setSearchText("");
    setSelectedFamily(ALL_FAMILIES);
    setSelectedCategory(ALL_CATEGORIES);
    setFilterOpen(false);
  }

  async function createOrder() {
    if (submittingRef.current || rows.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError("Cần chọn khách hoặc nhập tên khách và số điện thoại trước khi tạo đơn.");
      setCartOpen(true);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setCreatedCode(null);

    try {
      const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 15000));
      const order = await Promise.race([
        createManualOrder({ customerRecordId: selectedCustomer?.id, customerName, customerPhone, salesNote, items: manualItems }),
        timeout,
      ]);

      if (!order) {
        setSubmitError("Chưa xác nhận được đơn. Anh bấm Tải lại ở dashboard để kiểm tra trước khi tạo lại.");
        setCartOpen(true);
        return;
      }

      setCreatedCode(order.code);
      setManualItems([]);
      setSalesNote("");
      setCartOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không tạo được đơn hàng.");
      setCartOpen(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/sales" className="text-2xl text-slate-900">←</Link>
          <h1 className="text-center text-lg font-black text-slate-950">Lên đơn tay</h1>
          <button onClick={() => setCartOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-2xl bg-blue-700 text-xl text-white shadow-sm" aria-label="Mở đơn đang lên">
            🛒
            {totalQuantity > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">{totalQuantity}</span>}
          </button>
        </header>

        {createdCode && (
          <div className="mt-5 rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-100">
            <p className="font-black">Đã tạo đơn {createdCode}</p>
            <p className="mt-1 text-sm">Đơn đã được lưu và hiển thị trong dashboard sales.</p>
            <Link href="/sales" className="mt-3 inline-block rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white">Về dashboard</Link>
          </div>
        )}

        <section className="mt-5 rounded-3xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Khách hàng</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{selectedCustomer ? `${selectedCustomer.customer_code || "Khách"} · ${selectedCustomer.area || "Chưa khu vực"}` : "Chọn khách có sẵn hoặc tạo nhanh"}</p>
            </div>
            <button onClick={() => setCustomerPickerOpen(true)} className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white">Chọn khách</button>
          </div>
          <div className="mt-3 grid gap-3">
            <input value={customerName} disabled={submitting || Boolean(selectedCustomer)} onChange={(event) => { setCustomerName(event.target.value); setSubmitError(null); setSelectedCustomer(null); }} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Tên khách" />
            <input value={customerPhone} disabled={submitting || Boolean(selectedCustomer)} onChange={(event) => { setCustomerPhone(event.target.value); setSubmitError(null); setSelectedCustomer(null); }} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Số điện thoại" />
            {selectedCustomer?.address && <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-100">{selectedCustomer.address}</p>}
            {selectedCustomer && <button onClick={() => { setSelectedCustomer(null); setCustomerName("Khách tạo nhanh"); setCustomerPhone("0900000999"); }} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">Bỏ chọn khách</button>}
            <textarea value={salesNote} disabled={submitting} onChange={(event) => setSalesNote(event.target.value)} className="min-h-16 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Ghi chú sales" />
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Tìm sản phẩm</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{filteredProducts.length}/{products.length} sản phẩm · {selectedFamily} · {selectedCategory}</p>
            </div>
            {(searchText || selectedFamily !== ALL_FAMILIES || selectedCategory !== ALL_CATEGORIES) && <button onClick={clearProductFilters} className="text-sm font-black text-blue-700">Xóa lọc</button>}
          </div>

          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Tìm tên, mã, vị, thương hiệu..." />

          <button onClick={() => setFilterOpen((value) => !value)} className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{filterOpen ? "Đóng bộ lọc" : "Mở bộ lọc"}</button>

          {filterOpen && (
            <div className="mt-4 grid gap-4 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Nhóm lớn</p>
                <div className="grid grid-cols-3 gap-2">
                  {families.map((family) => <button key={family} onClick={() => { setSelectedFamily(family); setSelectedCategory(ALL_CATEGORIES); }} className={selectedFamily === family ? "rounded-2xl bg-blue-700 px-2 py-3 text-xs font-black text-white" : "rounded-2xl bg-white px-2 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-100"}>{family}</button>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Nhóm con</p>
                <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto">
                  {categories.map((category) => <button key={category} onClick={() => setSelectedCategory(category)} className={selectedCategory === category ? "rounded-2xl bg-slate-950 px-3 py-3 text-left text-sm font-black text-white" : "rounded-2xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>{category}</button>)}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-3 grid gap-3">
          {filteredProducts.map((product) => (
            <button key={product.id} disabled={submitting} onClick={() => startAddProduct(product)} className="grid grid-cols-[58px_1fr_40px] items-center gap-3 rounded-3xl bg-white p-3 text-left card-shadow ring-1 ring-slate-100 disabled:opacity-50">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-16 w-14 rounded-2xl object-cover" loading="lazy" /> : <div className="grid h-16 w-14 place-items-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-400">Ảnh</div>}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{getProductFamily(product)}</span>
                  <span className="truncate text-[11px] font-bold text-slate-400">{product.category || "Chưa phân nhóm"}</span>
                </div>
                <p className="mt-1 line-clamp-2 font-black text-slate-950">{product.name}</p>
                {productNeedsOptions(product) && <p className="mt-1 text-xs font-black text-amber-700">Chọn vị/biến thể</p>}
                <p className="mt-1 text-sm font-black text-blue-700">{formatMoney(product.price)}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-700 text-xl text-white">+</span>
            </button>
          ))}
        </section>
      </section>

      <button onClick={() => setCartOpen(true)} className="fixed bottom-24 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-blue-700 text-2xl text-white shadow-xl ring-4 ring-white" aria-label="Mở giỏ lên đơn">
        🛒
        {totalQuantity > 0 && <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1 text-xs font-black text-white">{totalQuantity}</span>}
      </button>

      {customerPickerOpen && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-slate-950/40 px-3 pb-3">
          <section className="w-full max-w-md rounded-3xl bg-white p-5 card-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Chọn khách</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Danh bạ khách</h2>
              </div>
              <button onClick={() => setCustomerPickerOpen(false)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Đóng</button>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_120px] gap-2">
              <input value={customerSearchText} onChange={(event) => setCustomerSearchText(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Tên, SĐT, mã..." />
              <select value={customerArea} onChange={(event) => setCustomerArea(event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-blue-700">
                {customerAreas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>

            <button onClick={() => setQuickCustomerOpen((value) => !value)} className="mt-3 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white">{quickCustomerOpen ? "Đóng tạo nhanh" : "+ Tạo khách nhanh"}</button>

            {quickCustomerOpen && (
              <div className="mt-3 grid max-h-[42vh] gap-2 overflow-y-auto rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <input value={quickCustomer.name} onChange={(event) => setQuickCustomer((current) => ({ ...current, name: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Tên khách / tên quán *" />
                <input value={quickCustomer.phone} onChange={(event) => setQuickCustomer((current) => ({ ...current, phone: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Số điện thoại *" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={quickCustomer.area} onChange={(event) => setQuickCustomer((current) => ({ ...current, area: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Khu vực" />
                  <input value={quickCustomer.contactPerson} onChange={(event) => setQuickCustomer((current) => ({ ...current, contactPerson: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Người LH" />
                </div>
                <input value={quickCustomer.address} onChange={(event) => setQuickCustomer((current) => ({ ...current, address: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Địa chỉ" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={quickCustomer.ward} onChange={(event) => setQuickCustomer((current) => ({ ...current, ward: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Phường/xã" />
                  <input value={quickCustomer.district} onChange={(event) => setQuickCustomer((current) => ({ ...current, district: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Quận/huyện" />
                </div>
                <button onClick={useCurrentLocation} disabled={customerLoading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300">Lấy vị trí hiện tại</button>
                {(quickCustomer.latitude && quickCustomer.longitude) && <p className="text-xs font-bold text-green-700">Đã lấy tọa độ: {quickCustomer.latitude}, {quickCustomer.longitude}</p>}
                <textarea value={quickCustomer.note} onChange={(event) => setQuickCustomer((current) => ({ ...current, note: event.target.value }))} className="min-h-14 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Ghi chú khách" />
                <button onClick={() => void saveQuickCustomer()} disabled={customerLoading} className="rounded-2xl bg-blue-700 px-4 py-4 font-black text-white disabled:bg-slate-300">{customerLoading ? "Đang lưu..." : "Lưu và chọn khách"}</button>
              </div>
            )}

            {customerError && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{customerError}</p>}

            <div className="mt-4 max-h-[48vh] overflow-y-auto pr-1">
              {customerLoading && !quickCustomerOpen ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Đang tải khách...</p> : filteredCustomers.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Không có khách phù hợp.</p> : filteredCustomers.map((customer) => (
                <button key={customer.id} onClick={() => chooseCustomer(customer)} className="mb-2 w-full rounded-2xl bg-white p-3 text-left ring-1 ring-slate-100 last:mb-0">
                  <p className="font-black text-slate-950">{customer.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{customer.phone}</p>
                  <p className="mt-1 text-xs font-bold text-blue-700">{customer.customer_code || "Chưa mã"} · {customer.area || "Chưa khu vực"}</p>
                  {customer.address && <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{customer.address}</p>}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-slate-950/40 px-3 pb-3">
          <section className="w-full max-w-md rounded-3xl bg-white p-5 card-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Đơn đang lên</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{totalQuantity} sản phẩm</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">{customerName} · {customerPhone}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Đóng</button>
            </div>

            <div className="mt-4 max-h-[48vh] overflow-y-auto pr-1">
              {rows.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Chưa có sản phẩm trong đơn.</p> : rows.map(({ product, quantity, options }) => product && (
                <article key={`${product.id}-${optionLabel(options)}`} className="border-b border-slate-100 py-3 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-950">{product.name}</p>
                      {optionLabel(options) && <p className="mt-1 text-xs font-black text-amber-700">{optionLabel(options)}</p>}
                      <p className="mt-1 text-sm font-bold text-blue-700">{formatMoney(product.price)}</p>
                    </div>
                    <p className="text-right font-black text-slate-950">{formatMoney(product.price * quantity)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button disabled={submitting} onClick={() => removeProduct(product.id, options)} className="text-sm font-bold text-slate-400 disabled:opacity-40">Xóa</button>
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                      <button disabled={submitting} onClick={() => decreaseProduct(product.id, options)} className="h-9 w-10 disabled:opacity-40">−</button>
                      <span className="w-10 text-center text-sm font-black">{quantity}</span>
                      <button disabled={submitting} onClick={() => addProduct(product.id, options)} className="h-9 w-10 disabled:opacity-40">+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {submitError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{submitError}</p>}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tổng cộng</p>
                <p className="text-2xl font-black text-blue-700">{formatMoney(total)}</p>
              </div>
              <button disabled={submitting || rows.length === 0} onClick={() => void createOrder()} className="rounded-2xl bg-blue-700 px-5 py-4 font-black text-white disabled:bg-slate-300">{submitting ? "Đang tạo..." : "Tạo đơn"}</button>
            </div>
          </section>
        </div>
      )}

      <SalesBottomNav />
      {optionProduct && <ProductOptionPicker product={optionProduct} onClose={() => setOptionProduct(null)} onConfirm={confirmOptions} />}
    </main>
  );
}
