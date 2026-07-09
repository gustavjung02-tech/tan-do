"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { ProductVariantList } from "@/components/ui/product-variant-list";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { Product } from "@/lib/mock/types";
import { ALL_CATEGORIES, ALL_FAMILIES, categoryList, familyList, getProductFamily, productMatchesTaxonomy } from "@/lib/services/product-taxonomy";
import { useAppStore } from "@/lib/store/app-store";
import { formatMoney } from "@/lib/utils";

export default function CustomerPage() {
  const { products, productLoadError, addToCart, cartCount } = useAppStore();
  const [searchText, setSearchText] = useState("");
  const [selectedFamily, setSelectedFamily] = useState(ALL_FAMILIES);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [visibleLimit, setVisibleLimit] = useState(40);
  const [filterOpen, setFilterOpen] = useState(false);


  const families = useMemo(() => familyList(products), [products]);
  const categories = useMemo(() => categoryList(products, selectedFamily), [products, selectedFamily]);

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory = productMatchesTaxonomy(product, selectedFamily, selectedCategory);
      const matchKeyword = !keyword
        || product.name.toLowerCase().includes(keyword)
        || product.sku.toLowerCase().includes(keyword)
        || product.brand?.toLowerCase().includes(keyword)
        || product.category?.toLowerCase().includes(keyword)
        || getProductFamily(product).toLowerCase().includes(keyword)
        || product.optionGroups?.some((group) => group.values.some((value) => value.toLowerCase().includes(keyword)));
      return matchCategory && matchKeyword;
    });
  }, [products, searchText, selectedFamily, selectedCategory]);

  const displayedProducts = filteredProducts.slice(0, visibleLimit);
  const hasFilter = Boolean(searchText || selectedFamily !== ALL_FAMILIES || selectedCategory !== ALL_CATEGORIES);

  function clearFilters() {
    setSearchText("");
    setSelectedFamily(ALL_FAMILIES);
    setSelectedCategory(ALL_CATEGORIES);
    setVisibleLimit(40);
    setFilterOpen(false);
  }

  function handleAdd(product: Product) { addToCart(product.id); }

  return (
    <main className="phone-page pb-28">
      <section className="mx-auto max-w-md px-4 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icons/tando-logo.png" alt="Tân Đô F&B" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
            <span className="text-xl font-black text-slate-950">Tân Đô</span>
          </Link>
          <NotificationBell />
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
              <p className="mt-1 text-xs font-bold text-emerald-700">{selectedFamily} · {selectedCategory}</p>
            </div>
            {hasFilter && <button onClick={clearFilters} className="text-xs font-black text-emerald-700">Xóa lọc</button>}
          </div>

          <button onClick={() => setFilterOpen((value) => !value)} className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">{filterOpen ? "Đóng bộ lọc" : "Mở bộ lọc"}</button>

          {filterOpen && (
            <div className="mt-4 grid gap-4 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Nhóm lớn</p>
                <div className="grid grid-cols-3 gap-2">
                  {families.map((family) => (
                    <button key={family} onClick={() => { setSelectedFamily(family); setSelectedCategory(ALL_CATEGORIES); setVisibleLimit(40); }} className={selectedFamily === family ? "rounded-2xl bg-emerald-700 px-2 py-3 text-xs font-black text-white" : "rounded-2xl bg-white px-2 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-100"}>{family}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Nhóm con</p>
                <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto">
                  {categories.map((category) => (
                    <button key={category} onClick={() => { setSelectedCategory(category); setVisibleLimit(40); }} className={selectedCategory === category ? "rounded-2xl bg-slate-950 px-3 py-3 text-left text-sm font-black text-white" : "rounded-2xl bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>{category}</button>
                  ))}
                </div>
              </div>
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
                <p className="mt-1 truncate text-sm text-slate-500">{getProductFamily(product)} · {product.category || "Chưa phân nhóm"}</p>
                {product.variants?.length ? <ProductVariantList product={product} onAdd={(variant)=>addToCart(product.id,variant)} /> : <p className="mt-2 font-black text-emerald-700">{formatMoney(product.price)}</p>}
              </div>
              <button onClick={() => handleAdd(product)} className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-700 text-2xl font-semibold leading-none text-white shadow-sm" aria-label={`Thêm ${product.name} vào giỏ`}>+</button>
            </article>
          ))}
          {visibleLimit < filteredProducts.length && <button onClick={() => setVisibleLimit((current) => current + 40)} className="rounded-2xl bg-white px-4 py-4 font-black text-emerald-700 ring-1 ring-emerald-100">Xem thêm sản phẩm</button>}
        </section>
      </section>

      <CustomerBottomNav />

    </main>
  );
}
