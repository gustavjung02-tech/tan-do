"use client";
import type {Product} from "@/lib/mock/types";
import {formatMoney} from "@/lib/utils";
export function ProductVariantList({product,onAdd}:{product:Product;onAdd:(variant:any)=>void}){
 if(!product.variants?.length)return null;
 return <div className="mt-2 grid gap-2">{product.variants.map((v)=><button key={v.id??v.variantKey} onClick={()=>onAdd(v)} className="grid grid-cols-[1fr_auto] items-center rounded-xl bg-slate-50 p-2 text-left ring-1 ring-slate-100"><div><p className="text-xs font-black">{v.variantKey}</p><p className="text-[11px] text-slate-500">{Object.values(v.options??{}).join(" / ")}</p><p className="text-[11px] text-slate-500">SKU: {v.sku??product.sku}</p></div><span className="font-black text-emerald-700">{formatMoney(Number(v.price))} +</span></button>)}</div>
}
