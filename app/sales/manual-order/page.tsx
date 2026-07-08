"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { SalesBottomNav } from "@/components/layout/sales-bottom-nav";
import { ProductOptionPicker, optionLabel, productNeedsOptions } from "@/components/ui/product-option-picker";
import type { CartItem, Product, SelectedProductOptions } from "@/lib/mock/types";
import { useAppStore } from "@/lib/store/app-store";
import { formatMoney } from "@/lib/utils";

const ALL_CATEGORIES = "Tất cả";

export default function ManualOrderPage() {
  const { products, createManualOrder } = useAppStore();
  const [customerName, setCustomerName] = useState("Khách tạo nhanh");
  const [customerPhone, setCustomerPhone] = useState("0900000999");
  const [salesNote, setSalesNote] = useState("");
  const [manualItems, setManualItems] = useState<CartItem[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionProduct, setOptionProduct] = useState<Product | null>(null);
  const submittingRef = useRef(false);

  const rows = manualItems
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item) => item.product);

  const total = useMemo(() => rows.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0), [rows]);
  const totalQuantity = rows.reduce((sum, item) => sum + item.quantity, 0);

  const categories = useMemo(() => {
    const values = products.map((product) => product.category?.trim()).filter(Boolean) as string[];
    return [ALL_CATEGORIES, ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "vi"))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory = selectedCategory === ALL_CATEGORIES || product.category === selectedCategory;
      const matchKeyword = !keyword
        || product.name.toLowerCase().includes(keyword)
        || product.sku.toLowerCase().includes(keyword)
        || product.brand?.toLowerCase().includes(keyword)
        || product.category?.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [products, searchText, selectedCategory]);

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
    setSelectedCategory(ALL_CATEGORIES);
    setFilterOpen(false);
  }

  async function createOrder() {
    if (submittingRef.current || rows.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError("Cần nhập tên khách và số điện thoại trước khi tạo đơn.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setCreatedCode(null);

    try {
      const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 15000));
      const order = await Promise.race([
        createManualOrder({ customerName, customerPhone, salesNote, items: manualItems }),
        timeout,
      ]);

      if (!order) {
        setSubmitError("Chưa xác nhận được đơn. Anh bấm Tải lại ở dashboard để kiểm tra trước khi tạo lại.");
        return;
      }

      setCreatedCode(order.code);
      setManualItems([]);
      setSalesNote("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không tạo được đơn hàng.");
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
          <div />
        </header>

        {createdCode && (
          <div className="mt-5 rounded-2xl bg-green-50 p-4 text-green-800 ring-1 ring-green-100">
            <p className="font-black">Đã tạo đơn {createdCode}</p>
            <p className="mt-1 text-sm">Đơn đã được lưu và hiển thị trong dashboard sales.</p>
            <Link href="/sales" className="mt-3 inline-block rounded-xl bg-green-700 px-4 py-2 text-sm font-black text-white">Về dashboard</Link>
          </div>
        )}

        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <h2 className="font-black text-slate-950">Thông tin khách</h2>
          <div className="mt-3 grid gap-3">
            <input value={customerName} disabled={submitting} onChange={(event) => { setCustomerName(event.target.value); setSubmitError(null); }} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Tên khách" />
            <input value={customerPhone} disabled={submitting} onChange={(event) => { setCustomerPhone(event.target.value); setSubmitError(null); }} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Số điện thoại" />
            <textarea value={salesNote} disabled={submitting} onChange={(event) => setSalesNote(event.target.value)} className="min-h-16 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-50" placeholder="Ghi chú sales" />
          </div>
        </section>

        <section className="sticky top-2 z-20 mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-blue-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Đơn đang lên</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{totalQuantity} sản phẩm · {rows.length} dòng</p>
            </div>
            <p className="text-right text-xl font-black text-blue-700">{formatMoney(total)}</p>
          </div>

          <div className="mt-3 grid max-h-56 gap-3 overflow-y-auto pr-1">
            {rows.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Chọn sản phẩm bên dưới để lên đơn.</p>
            ) : rows.map(({ product, quantity, options }) => product && (
              <article key={product.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">{product.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{product.category || "Chưa phân nhóm"}</p>
                    {optionLabel(options) && <p className="mt-1 text-xs font-black text-amber-700">{optionLabel(options)}</p>}
                    <p className="mt-1 text-sm font-bold text-blue-700">{formatMoney(product.price)}</p>
                  </div>
                  <p className="text-right font-black text-slate-950">{formatMoney(product.price * quantity)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button disabled={submitting} onClick={() => removeProduct(product.id, options)} className="text-sm font-bold text-slate-400 disabled:opacity-40">Xóa</button>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                    <button disabled={submitting} onClick={() => decreaseProduct(product.id, options)} className="h-8 w-9 disabled:opacity-40">−</button>
                    <span className="w-9 text-center text-sm font-black">{quantity}</span>
                    <button disabled={submitting} onClick={() => addProduct(product.id, options)} className="h-8 w-9 disabled:opacity-40">+</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {submitError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{submitError}</p>}

          <button disabled={submitting || rows.length === 0} onClick={() => void createOrder()} className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-4 font-black text-white disabled:bg-slate-300">
            {submitting ? "Đang tạo đơn..." : "Tạo đơn"}
          </button>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Chọn sản phẩm</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Đang hiện {filteredProducts.length}/{products.length} sản phẩm</p>
              <p className="mt-1 text-xs font-bold text-blue-700">Nhóm: {selectedCategory}</p>
            </div>
            {(searchText || selectedCategory !== ALL_CATEGORIES) && <button onClick={clearProductFilters} className="text-sm font-black text-blue-700">Xóa lọc</button>}
          </div>

          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-700" placeholder="Tìm tên, mã, vị, nhóm hàng..." />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setFilterOpen((value) => !value)} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">{filterOpen ? "Đóng nhóm" : "Nhóm hàng"}</button>
            <button onClick={() => { setSelectedCategory(ALL_CATEGORIES); setFilterOpen(false); }} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">Tất cả</button>
          </div>

          {filterOpen && (
            <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
              {categories.map((category) => (
                <button key={category} onClick={() => { setSelectedCategory(category); setFilterOpen(false); }} className={selectedCategory === category ? "rounded-xl bg-blue-700 px-3 py-3 text-left text-sm font-black text-white" : "rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>{category}</button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-3 grid gap-3">
          {filteredProducts.map((product) => (
            <button key={product.id} disabled={submitting} onClick={() => startAddProduct(product)} className="grid grid-cols-[56px_1fr_38px] items-center gap-3 rounded-2xl bg-white p-3 text-left card-shadow ring-1 ring-slate-100 disabled:opacity-50">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-14 w-12 rounded-lg object-cover" loading="lazy" /> : <div className="grid h-14 w-12 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400">Ảnh</div>}
              <div className="min-w-0">
                <p className="font-bold text-slate-950">{product.name}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{product.category || "Chưa phân nhóm"}</p>
                {productNeedsOptions(product) && <p className="mt-1 text-xs font-black text-amber-700">Cần chọn vị/biến thể</p>}
                <p className="mt-1 text-sm font-black text-blue-700">{formatMoney(product.price)}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-xl text-white">+</span>
            </button>
          ))}
        </section>
      </section>
      <SalesBottomNav />
      {optionProduct && <ProductOptionPicker product={optionProduct} onClose={() => setOptionProduct(null)} onConfirm={confirmOptions} />}
    </main>
  );
}
