import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "node:fs";

function readEnvFile(path) {
  const env = {};
  if (!fs.existsSync(path)) return env;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const rawPublicBaseUrl = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
const publicBaseUrl = rawPublicBaseUrl && /^https?:\/\//i.test(rawPublicBaseUrl)
  ? rawPublicBaseUrl
  : rawPublicBaseUrl
    ? `https://${rawPublicBaseUrl}`
    : undefined;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const catalog = "hung-phat-v2";

if (!publicBaseUrl) throw new Error("Missing R2_PUBLIC_BASE_URL");
if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase server env");

async function fetchJson(path) {
  const response = await fetch(`${publicBaseUrl}/${path}`);
  if (!response.ok) throw new Error(`Cannot fetch ${path}: ${response.status}`);
  return response.json();
}


function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCategory(product) {
  const raw = normalizeText(product.subcategory || product.industry);
  const upper = raw.toUpperCase();
  if (upper.includes("SINH TỐ")) return "Sinh tố";
  if (upper.includes("SIRO")) return "Siro";
  if (upper.includes("TRÂN CHÂU")) return "Trân châu";
  if (upper.includes("BÔT") || upper.includes("BỘT") || upper.includes("SUA") || upper.includes("SỮA")) {
    if (upper.includes("CACAO")) return "Bột cacao";
    if (upper.includes("SỮA ĐẶC")) return "Sữa đặc";
    return "Bột sữa";
  }
  if (upper.includes("TRÀ CÁC LOẠI")) return "Trà các loại";
  if (upper.includes("TRAI CÂY") || upper.includes("TRÁI CÂY")) return "Trái cây hộp";
  if (upper.includes("ĐƯỜNG ĐEN")) return "Đường đen";
  if (upper.includes("THỰC PHẨM ĐÔNG LẠNH")) return "Thực phẩm đông lạnh";
  if (upper.includes("BÁNH TRÁNG")) return "Nguyên liệu bánh tráng";
  if (upper.includes("MỲ CAY") || upper.includes("MÌ CAY")) return "Nguyên liệu mì cay";
  if (upper.includes("3Q")) return "3Q giòn";
  if (upper.includes("RAU CÂU")) return "Rau câu";
  if (upper.includes("SÔT") || upper.includes("SỐT")) return "Sốt topping";
  if (upper.includes("FLAN")) return "Flan";
  if (upper.includes("BAO LY")) return "Bao ly";
  if (upper.includes("NẮP")) return "Nắp";
  if (upper.includes("MUỖNG")) return "Muỗng";
  if (upper.includes("ỐNG HÚT") || upper.includes("ÔNG HÚT")) return "Ống hút";
  if (raw.toLowerCase() === "đồ lẻ") return "Đồ lẻ";
  return raw || "Chưa phân nhóm";
}

function normalizeOptionGroups(optionGroups) {
  if (!Array.isArray(optionGroups)) return [];
  return optionGroups
    .map((group) => ({
      name: normalizeText(group.name),
      values: Array.isArray(group.values) ? group.values.map(normalizeText).filter(Boolean) : [],
    }))
    .filter((group) => group.name && group.values.length > 0);
}

function toMoney(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function toSku(productKey) {
  return `HP-${String(productKey).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`.slice(0, 80);
}

function toImageUrl(product) {
  const objectKey = product.image?.status === "available" ? product.image.objectKey : null;
  return objectKey ? `${publicBaseUrl}/${objectKey}` : null;
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

const products = await fetchJson("catalog/hung-phat/v2/manifests/products.json");
const productList = Array.isArray(products) ? products : Object.values(products);
const activeProducts = productList.filter((product) => product.status === "active");

const rows = activeProducts.map((product) => ({
  name: product.name,
  sku: toSku(product.productKey),
  price: toMoney(product.shopPriceFrom),
  unit: "cÃ¡i",
  image_url: toImageUrl(product),
  is_active: true,
  brand: product.brand || null,
  category: normalizeCategory(product),
  source_catalog: catalog,
  source_key: product.productKey,
  industry: product.industry || null,
  source_group: product.sourceGroup || null,
  price_mode: product.priceMode || "fixed",
  price_label: product.priceLabel || null,
  option_groups: normalizeOptionGroups(product.optionGroups),
  variant_keys: Array.isArray(product.variantKeys) ? product.variantKeys : [],
}));

const missingImage = rows.filter((row) => !row.image_url).length;
const chunkSize = 50;
let imported = 0;

for (let index = 0; index < rows.length; index += chunkSize) {
  const chunk = rows.slice(index, index + chunkSize);
  const { error } = await supabase
    .from("products")
    .upsert(chunk, { onConflict: "source_catalog,source_key" });

  if (error) throw error;
  imported += chunk.length;
}

const { error: hideOldError, count: hiddenOldCount } = await supabase
  .from("products")
  .update({ is_active: false })
  .or(`source_catalog.is.null,source_catalog.neq.${catalog}`)
  .select("id", { count: "exact", head: true });

if (hideOldError) throw hideOldError;

const { count: activeCount, error: countError } = await supabase
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("source_catalog", catalog)
  .eq("is_active", true);

if (countError) throw countError;

console.log(JSON.stringify({
  imported,
  activeCount,
  missingImage,
  hiddenOldCount: hiddenOldCount ?? 0,
  catalog,
}, null, 2));