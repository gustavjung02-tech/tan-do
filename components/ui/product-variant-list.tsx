"use client";
import type { Product, ProductVariant } from "@/lib/mock/types";
import { formatMoney } from "@/lib/utils";

type ProductVariantListProps = {
  product: Product;
  onAdd: (variant: ProductVariant) => void;
};

export function ProductVariantList({ product, onAdd }: ProductVariantListProps) {
  if (!product.variants?.length) return null;

  return (
    <div className="mt-2 grid gap-2">
      {product.variants.map((variant) => (
        <button
          key={variant.id ?? variant.variantKey}
          type="button"
          aria-label={`Chọn biến thể ${variant.variantKey}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAdd(variant);
          }}
          className="grid grid-cols-[1fr_auto] items-center rounded-xl bg-slate-50 p-2 text-left ring-1 ring-slate-100"
        >
          <div>
            <p className="text-xs font-black">{variant.variantKey}</p>
            <p className="text-[11px] text-slate-500">{Object.values(variant.options ?? {}).join(" / ")}</p>
            <p className="text-[11px] text-slate-500">SKU: {variant.sku ?? product.sku}</p>
          </div>
          <span className="font-black text-emerald-700">{formatMoney(Number(variant.price))} +</span>
        </button>
      ))}
    </div>
  );
}
