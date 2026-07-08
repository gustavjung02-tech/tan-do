import { mockProducts } from "@/lib/mock/data";
import type { Product, ProductOptionGroup } from "@/lib/mock/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ProductRow } from "@/lib/supabase/types";

function parseOptionGroups(value: unknown): ProductOptionGroup[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((group) => ({
      name: typeof group?.name === "string" ? group.name : "",
      values: Array.isArray(group?.values) ? group.values.filter((item: unknown) => typeof item === "string") as string[] : [],
    }))
    .filter((group) => group.name && group.values.length > 0);
}

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
    industry: row.industry ?? undefined,
    sourceGroup: row.source_group ?? undefined,
    priceMode: row.price_mode ?? undefined,
    priceLabel: row.price_label ?? undefined,
    optionGroups: parseOptionGroups(row.option_groups),
    variantKeys: row.variant_keys ?? [],
  };
}

export async function fetchProductsWithFallback(): Promise<{ products: Product[]; source: "supabase" | "mock"; error?: string }> {
  if (!supabaseBrowser) {
    return { products: mockProducts, source: "mock", error: "Supabase env is missing." };
  }

  const { data, error } = await supabaseBrowser
    .from("products")
    .select("id,name,sku,price,image_url,unit,is_active,brand,category,industry,source_group,price_mode,price_label,option_groups,variant_keys")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return { products: mockProducts, source: "mock", error: error?.message ?? "No products returned." };
  }

  return { products: data.map((row) => mapProduct(row as ProductRow)), source: "supabase" };
}
