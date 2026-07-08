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

type Params = {
  params: Promise<{ id: string }>;
};

function cleanUpdateBody(body: ProductBody) {
  const update: Record<string, string | number | boolean | null> = {};

  if (body.name !== undefined) update.name = body.name.trim();
  if (body.sku !== undefined) update.sku = body.sku.trim() || null;
  if (body.price !== undefined) update.price = Number(body.price);
  if (body.unit !== undefined) update.unit = body.unit.trim() || "cái";
  if (body.imageUrl !== undefined) update.image_url = body.imageUrl.trim() || null;
  if (body.brand !== undefined) update.brand = body.brand.trim() || null;
  if (body.category !== undefined) update.category = body.category.trim() || null;
  if (body.isActive !== undefined) update.is_active = body.isActive;

  return update;
}

export async function PATCH(request: Request, context: Params) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { id } = await context.params;
  const update = cleanUpdateBody(await request.json() as ProductBody);

  if (typeof update.name === "string" && !update.name) {
    return NextResponse.json({ error: "Tên sản phẩm không được để trống." }, { status: 400 });
  }

  if (update.price !== undefined && (!Number.isFinite(Number(update.price)) || Number(update.price) < 0)) {
    return NextResponse.json({ error: "Giá sản phẩm không hợp lệ." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(update)
    .eq("id", id)
    .select("id,name,sku,price,image_url,unit,is_active,brand,category,industry,source_group,price_mode,price_label,option_groups,variant_keys,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}