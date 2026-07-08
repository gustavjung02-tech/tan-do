import { NextResponse } from "next/server";
import { requireAuth, requireStaff } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyStaffAboutNewOrder } from "@/lib/services/notifications";
import type { CartItem, Order, OrderStatus, SelectedProductOptions } from "@/lib/mock/types";

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
  customer_id?: string | null;
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

type CreateOrderBody = {
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  salesNote?: string;
  source?: "customer" | "sales_manual";
  items?: CartItem[];
  clientRequestId?: string;
};


function normalizeOptions(options?: SelectedProductOptions): SelectedProductOptions | undefined {
  if (!options) return undefined;
  const entries = Object.entries(options)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => key && value);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function formatProductNameWithOptions(productName: string, options?: SelectedProductOptions) {
  const normalized = normalizeOptions(options);
  if (!normalized) return productName;
  return `${productName} — ${Object.entries(normalized).map(([key, value]) => `${key}: ${value}`).join(", ")}`;
}

function mapOrder(row: OrderRow): Order {
  const items = (row.order_items ?? []).map((item) => ({
    id: item.id,
    productId: item.product_id ?? "",
    productName: item.product_name,
    unitPrice: Number(item.unit_price),
    quantity: Number(item.quantity),
    lineTotal: Number(item.line_total),
  }));

  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name ?? "Khách chưa đặt tên",
    customerPhone: row.customer_phone ?? "Chưa có SĐT",
    source: row.source,
    status: row.status,
    customerNote: row.customer_note ?? undefined,
    salesNote: row.sales_note ?? undefined,
    salesName: row.source === "sales_manual" || row.status !== "new" ? "Sales" : undefined,
    total: Number(row.total),
    items,
    createdAt: row.created_at,
  };
}

async function findExistingCustomerOrder(customerId: string | null, clientRequestId: string | null) {
  if (!supabaseAdmin || !customerId || !clientRequestId) return null;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", customerId)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (error) {
    console.error("Failed to lookup existing customer order", error);
    return null;
  }

  return data ? mapOrder(data as OrderRow) : null;
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source")?.trim();

  let query = supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (source === "customer") {
    const auth = await requireAuth(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
    query = query.eq("customer_id", auth.context.userId).eq("source", "customer");
  } else {
    const staff = await requireStaff(request);
    if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });
    if (source === "sales_manual") query = query.eq("source", "sales_manual");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: (data ?? []).map((row) => mapOrder(row as OrderRow)) });
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const body = await request.json() as CreateOrderBody;
  const source = body.source ?? "customer";
  const clientRequestId = body.clientRequestId?.trim() || null;
  let customerId: string | null = null;
  let customerName = body.customerName?.trim() || "Khách chưa đặt tên";
  let customerPhone = body.customerPhone?.trim() || "Chưa có SĐT";

  if (source === "sales_manual") {
    const staff = await requireStaff(request);
    if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });
  } else {
    const auth = await requireAuth(request);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
    customerId = auth.context.userId;
    customerName = auth.context.profile.full_name || customerName;
    customerPhone = auth.context.profile.phone || customerPhone;

    const existingOrder = await findExistingCustomerOrder(customerId, clientRequestId);
    if (existingOrder) return NextResponse.json({ order: existingOrder });
  }

  const items = body.items ?? [];

  if (items.length === 0) {
    return NextResponse.json({ error: "Đơn hàng chưa có sản phẩm." }, { status: 400 });
  }

  const productIds = items.map((item) => item.productId);
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id,name,price,option_groups")
    .in("id", productIds);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const orderItems = items.map((item) => {
    const product = products?.find((entry) => entry.id === item.productId);
    if (!product) return null;
    const unitPrice = Number(product.price);
    const quantity = item.quantity;
    return {
      product_id: product.id,
      product_name: formatProductNameWithOptions(product.name, item.options),
      unit_price: unitPrice,
      quantity,
      line_total: unitPrice * quantity,
    };
  }).filter(Boolean) as Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;

  if (orderItems.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm hợp lệ." }, { status: 400 });
  }

  const total = orderItems.reduce((sum, item) => sum + item.line_total, 0);
  const { data: codeData, error: codeError } = await supabaseAdmin.rpc("next_order_code");

  if (codeError) {
    return NextResponse.json({ error: codeError.message }, { status: 500 });
  }

  const status = source === "sales_manual" ? "confirmed" : "new";

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      code: codeData,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      client_request_id: source === "customer" ? clientRequestId : null,
      source,
      status,
      customer_note: body.customerNote?.trim() || null,
      sales_note: body.salesNote?.trim() || null,
      total,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    if (source === "customer" && orderError?.code === "23505") {
      const existingOrder = await findExistingCustomerOrder(customerId, clientRequestId);
      if (existingOrder) return NextResponse.json({ order: existingOrder });
    }
    return NextResponse.json({ error: orderError?.message ?? "Không tạo được đơn hàng." }, { status: 500 });
  }
  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))
    .select("*");

  if (itemsError) {
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const mappedOrder = mapOrder({ ...(order as OrderRow), order_items: insertedItems as OrderItemRow[] });

  if (source === "customer") {
    void notifyStaffAboutNewOrder(order as { id: string; code: string; customer_name?: string | null; total?: number | string | null }).catch((error) => {
      console.error("Failed to notify staff about new order", error);
    });
  }

  return NextResponse.json({ order: mappedOrder });
}