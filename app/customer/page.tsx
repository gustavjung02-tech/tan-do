"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { ProductOptionPicker, productNeedsOptions } from "@/components/ui/product-option-picker";
import type { Product, SelectedProductOptions } from "@/lib/mock/types";
import { useAppStore } from "@/lib/store/app-store";
import { formatMoney } from "@/lib/utils";

const ALL_CATEGORIES = "Tất cả";

export default function CustomerPage() {
  const { products, productLoadError, addToCart, cartCount } = useAppStore();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [visibleLimit, setVisibleLimit] = useState(40);
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionProduct, setOptionProduct] = useState<Product | null>(null);

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
        || product.category?.toLowerCase().includes(keyword)
        || product.optionGroups?.some((group) => group.values.some((value) => value.toLowerCase().includes(keyword)));
      return matchCategory && matchKeyword;
    });
  }, [products, searchText, selectedCategory]);

  const displayedProducts = filteredProducts.slice(0, visibleLimit);
  const hasFilter = Boolean(searchText || selectedCategory !== ALL_CATEGORIES);

  function clearFilters() {
    setSearchText("");
    setSelectedCategory(ALL_CATEGORIES);
    setVisibleLimit(40);
    setFilterOpen(false);
  }

  function handleAdd(product: Product) {
    if (productNeedsOptions(product)) {
      setOptionProduct(product);
      return;
    }
    addToCart(product.id);
  }

  function confirmOptions(options: SelectedProductOptions) {
    if (!optionProduct) return;
    addToCart(optionProduct.id, options);
    setOptionProduct(null);
  }

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icons/tando-logo.png" alt="Tân Đô F&B" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
            <span className="text-xl font-black text-slate-950">Tân Đô</span>
          </Link>
          <Link href="/customer/cart" className="relative text-2xl leading-none text-slate-900" aria-label="Giỏ hàng">
            🛒
            {cartCount > 0 && <span className="absolute -right-3 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">{cartCount}</span>}
          </Link>
        </header>

        <div className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-lime-100 p-5 card-shadow ring-1 ring-emerald-100">
          <h1 className="text-2xl font-black leading-tight text-slate-950">Đặt hàng nhanh<br />Giao dịch dễ dàng</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Sản phẩm có ảnh rõ, nhóm hàng chuẩn theo catalog Bếp Sỉ/Tân Đô.</p>
        </div>

        <section className="mt-5 rounded-2xl bg-white p-3 card-shadow ring-1 ring-slate-100">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Tìm sản phẩm
            <input value={searchText} onChange={(event) => { setSearchText(event.target.value); setVisibleLimit(40); }} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-700" placeholder="Nhập tên, mã, vị, thương hiệu..." />
          </label>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 card-shadow ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Lọc sản phẩm</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Đang hiển thị {filteredProducts.length}/{products.length} sản phẩm</p>
              <p className="mt-1 text-xs font-bold text-emerald-700">Nhóm: {selectedCategory}</p>
            </div>
            {hasFilter && <button onClick={clearFilters} className="text-xs font-black text-emerald-700">Xóa lọc</button>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setFilterOpen((value) => !value)} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">{filterOpen ? "Đóng nhóm" : "Chọn nhóm"}</button>
            <button onClick={() => { setSelectedCategory(ALL_CATEGORIES); setVisibleLimit(40); }} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">Tất cả</button>
          </div>

          {filterOpen && (
            <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
              {categories.map((category) => (
                <button key={category} onClick={() => { setSelectedCategory(category); setVisibleLimit(40); setFilterOpen(false); }} className={selectedCategory === category ? "rounded-xl bg-emerald-700 px-3 py-3 text-left text-sm font-black text-white" : "rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>{category}</button>
              ))}
            </div>
          )}
        </section>

        {productLoadError && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 ring-1 ring-amber-100">Chưa tải được dữ liệu mới nhất, đang dùng dữ liệu dự phòng.</div>}

        <section className="mt-4 grid gap-3">
          {filteredProducts.length === 0 ? <div className="rounded-2xl bg-white p-5 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-100">Không có sản phẩm phù hợp.</div> : displayedProducts.map((product) => (
            <article key={product.id} className="grid grid-cols-[72px_1fr_42px] items-center gap-3 rounded-2xl bg-white p-3 card-shadow ring-1 ring-slate-100">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-20 w-16 rounded-xl object-cover" loading="lazy" /> : <div className="grid h-20 w-16 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">Ảnh</div>}
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-slate-950">{product.name}</h3>
                <p className="mt-1 truncate text-sm text-slate-500">{product.category || "Chưa phân nhóm"}</p>
                {productNeedsOptions(product) && <p className="mt-1 text-xs font-black text-amber-700">Cần chọn vị/biến thể</p>}
                <p className="mt-2 font-black text-emerald-700">{formatMoney(product.price)}</p>
              </div>
              <button onClick={() => handleAdd(product)} className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-700 text-2xl font-semibold leading-none text-white shadow-sm" aria-label={`Thêm ${product.name} vào giỏ`}>+</button>
            </article>
          ))}
          {visibleLimit < filteredProducts.length && <button onClick={() => setVisibleLimit((current) => current + 40)} className="rounded-2xl bg-white px-4 py-4 font-black text-emerald-700 ring-1 ring-emerald-100">Xem thêm sản phẩm</button>}
        </section>
      </section>

      <CustomerBottomNav />
      {optionProduct && <ProductOptionPicker product={optionProduct} onClose={() => setOptionProduct(null)} onConfirm={confirmOptions} />}
    </main>
  );
}
