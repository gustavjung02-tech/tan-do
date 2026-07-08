import { NextResponse } from "next/server";
import { requireAuth, requireStaff } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyCustomerAboutOrderStatus } from "@/lib/services/notifications";
import type { OrderStatus } from "@/lib/mock/types";

const allowedStatuses: OrderStatus[] = ["new", "confirmed", "processing", "completed", "cancelled"];

type Params = {
  params: Promise<{ id: string }>;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number | string;
  quantity: number | string;
  line_total: number | string;
};

type OrderRow = {
  id: string;
  code: string;
  customer_name: string | null;
  customer_phone: string | null;
  source: "customer" | "sales_manual";
  status: OrderStatus;
  customer_note: string | null;
  sales_note: string | null;
  total: number | string;
  created_at: string;
  order_items?: OrderItemRow[];
};

function mapOrder(row: OrderRow) {
  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name ?? "Khách chưa đặt tên",
    customerPhone: row.customer_phone ?? "Chưa có SĐT",
    source: row.source,
    status: row.status,
    customerNote: row.customer_note ?? undefined,
    salesNote: row.sales_note ?? undefined,
    total: Number(row.total),
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id ?? "",
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      lineTotal: Number(item.line_total),
    })),
  };
}

export async function GET(request: Request, context: Params) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { id } = await context.params;
  const isStaff = auth.context.profile.role === "sales" || auth.context.profile.role === "admin";

  let query = supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id);

  if (!isStaff) {
    query = query.eq("customer_id", auth.context.userId).eq("source", "customer");
  }

  const { data, error } = await query.single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ order: mapOrder(data as OrderRow) });
}

export async function PATCH(request: Request, context: Params) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { id } = await context.params;
  const body = await request.json() as { status?: OrderStatus };

  if (!body.status || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Trạng thái đơn hàng không hợp lệ." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: body.status })
    .eq("id", id)
    .select("id,code,customer_id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void notifyCustomerAboutOrderStatus(data as { id: string; code: string; customer_id?: string | null; status: string }).catch((notifyError) => {
    console.error("Failed to notify customer about order status", notifyError);
  });

  return NextResponse.json({ order: data });
}