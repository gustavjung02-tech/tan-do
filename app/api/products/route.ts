import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProductBody = {
  name?: string;
  sku?: string;
  price?: number;
  unit?: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  isActive?: boolean;
};

function cleanProductBody(body: ProductBody) {
  return {
    name: body.name?.trim() ?? "",
    sku: body.sku?.trim() || null,
    price: Number(body.price ?? 0),
    unit: body.unit?.trim() || "cái",
    image_url: body.imageUrl?.trim() || null,
    brand: body.brand?.trim() || null,
    category: body.category?.trim() || null,
    is_active: body.isActive ?? true,
  };
}

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,name,sku,price,image_url,unit,is_active,brand,category,industry,source_group,price_mode,price_label,option_groups,variant_keys,created_at,updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const body = cleanProductBody(await request.json() as ProductBody);

  if (!body.name) {
    return NextResponse.json({ error: "Tên sản phẩm không được để trống." }, { status: 400 });
  }

  if (!Number.isFinite(body.price) || body.price < 0) {
    return NextResponse.json({ error: "Giá sản phẩm không hợp lệ." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert(body)
    .select("id,name,sku,price,image_url,unit,is_active,brand,category,industry,source_group,price_mode,price_label,option_groups,variant_keys,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}