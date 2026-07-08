"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, SelectedProductOptions } from "@/lib/mock/types";
import { formatMoney } from "@/lib/utils";

export function optionLabel(options?: SelectedProductOptions) {
  if (!options) return "";
  return Object.entries(options)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

export function productNeedsOptions(product: Product) {
  return Boolean(product.optionGroups?.some((group) => group.values.length > 0));
}

export function ProductOptionPicker({ product, onClose, onConfirm }: {
  product: Product;
  onClose: () => void;
  onConfirm: (options: SelectedProductOptions) => void;
}) {
  const groups = product.optionGroups ?? [];
  const initialOptions = useMemo(() => Object.fromEntries(groups.map((group) => [group.name, group.values[0] ?? ""])), [groups]);
  const [options, setOptions] = useState<SelectedProductOptions>(initialOptions);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 px-3 pb-3">
      <section className="w-full max-w-md rounded-3xl bg-white p-5 card-shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Chọn biến thể</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{product.name}</h2>
            <p className="mt-1 text-sm font-black text-emerald-700">{formatMoney(product.price)}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Đóng</button>
        </div>

        <div className="mt-4 grid gap-4">
          {groups.map((group) => (
            <div key={group.name}>
              <p className="mb-2 text-sm font-black text-slate-800">{group.name}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.values.map((value) => {
                  const active = options[group.name] === value;
                  return (
                    <button key={value} onClick={() => setOptions((current) => ({ ...current, [group.name]: value }))} className={active ? "rounded-xl bg-emerald-700 px-3 py-3 text-sm font-black text-white" : "rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100"}>
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => onConfirm(options)} className="mt-5 w-full rounded-2xl bg-emerald-700 px-4 py-4 font-black text-white">
          Thêm vào đơn
        </button>
      </section>
    </div>
  );
}
