import type { Product } from "@/lib/mock/types";

export const ALL_FAMILIES = "Tất cả";
export const ALL_CATEGORIES = "Tất cả nhóm";

const TEA_MILK_CATEGORIES = new Set([
  "Sinh tố",
  "Siro",
  "Trà các loại",
  "Bột sữa",
  "Bột cacao",
  "Trân châu",
  "3Q giòn",
  "Rau câu",
  "Sốt topping",
  "Flan",
  "Sữa đặc",
  "Đường đen",
  "Trái cây hộp",
  "Đồ lẻ",
]);

export function getProductFamily(product: Product) {
  const category = product.category?.trim() || "Chưa phân nhóm";
  const industry = product.industry?.trim().toLowerCase() || "";

  if (category === "Thực phẩm đông lạnh") return "Đông lạnh";
  if (category === "Nguyên liệu bánh tráng") return "Bánh tráng";
  if (category === "Nguyên liệu mì cay") return "Mì cay";
  if (["Bao ly", "Nắp", "Muỗng", "Ống hút"].includes(category) || industry.includes("bao bì")) return "Bao bì";
  if (TEA_MILK_CATEGORIES.has(category) || industry.includes("trà sữa")) return "Trà sữa";
  return "Khác";
}

export function getFamilyOrder(family: string) {
  return ["Tất cả", "Trà sữa", "Đông lạnh", "Bánh tráng", "Mì cay", "Bao bì", "Khác"].indexOf(family);
}

export function familyList(products: Product[]) {
  const values = Array.from(new Set(products.map(getProductFamily)));
  return [ALL_FAMILIES, ...values.sort((a, b) => {
    const left = getFamilyOrder(a);
    const right = getFamilyOrder(b);
    if (left !== right) return left - right;
    return a.localeCompare(b, "vi");
  })];
}

export function categoryList(products: Product[], family: string) {
  const scoped = family === ALL_FAMILIES ? products : products.filter((product) => getProductFamily(product) === family);
  const values = scoped.map((product) => product.category?.trim()).filter(Boolean) as string[];
  return [ALL_CATEGORIES, ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "vi"))];
}

export function productMatchesTaxonomy(product: Product, family: string, category: string) {
  const matchFamily = family === ALL_FAMILIES || getProductFamily(product) === family;
  const matchCategory = category === ALL_CATEGORIES || product.category === category;
  return matchFamily && matchCategory;
}
