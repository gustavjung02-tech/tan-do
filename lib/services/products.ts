import { mockProducts } from "@/lib/mock/data";
import type { Product } from "@/lib/mock/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ProductRow } from "@/lib/supabase/types";

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    price: Number(row.price),
    imageUrl: row.image_url ?? "",
    unit: row.unit,
    isActive: row.is_active,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
  };
}

export async function fetchProductsWithFallback(): Promise<{ products: Product[]; source: "supabase" | "mock"; error?: string }> {
  if (!supabaseBrowser) {
    return { products: mockProducts, source: "mock", error: "Supabase env is missing." };
  }

  const { data, error } = await supabaseBrowser
    .from("products")
    .select("id,name,sku,price,image_url,unit,is_active,brand,category")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { products: mockProducts, source: "mock", error: error?.message ?? "No products returned." };
  }

  return { products: data.map((row) => mapProduct(row as ProductRow)), source: "supabase" };
}