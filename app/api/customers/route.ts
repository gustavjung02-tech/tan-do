import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { cleanCustomerInput, normalizePhone, type Customer } from "@/lib/services/customers";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OrderStatRow = {
  customer_phone: string | null;
  total: number | string | null;
  created_at: string;
};

function withOrderStats(customers: Customer[], orders: OrderStatRow[]) {
  const stats = new Map<string, { order_count: number; total_spent: number; last_order_at: string | null }>();

  for (const order of orders) {
    const phone = normalizePhone(order.customer_phone);
    if (!phone) continue;
    const current = stats.get(phone) ?? { order_count: 0, total_spent: 0, last_order_at: null };
    current.order_count += 1;
    current.total_spent += Number(order.total ?? 0);
    if (!current.last_order_at || new Date(order.created_at).getTime() > new Date(current.last_order_at).getTime()) {
      current.last_order_at = order.created_at;
    }
    stats.set(phone, current);
  }

  return customers.map((customer) => ({
    ...customer,
    ...(stats.get(normalizePhone(customer.phone)) ?? { order_count: 0, total_spent: 0, last_order_at: null }),
  }));
}

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim();
  const area = searchParams.get("area")?.trim();

  let query = supabaseAdmin
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (area) query = query.eq("area", area);
  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%,customer_code.ilike.%${keyword}%,address.ilike.%${keyword}%`);
  }

  const { data: customers, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("customer_phone,total,created_at");

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  return NextResponse.json({ customers: withOrderStats((customers ?? []) as Customer[], (orders ?? []) as OrderStatRow[]) });
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const body = cleanCustomerInput(await request.json());
  if (!body.name) return NextResponse.json({ error: "Tên khách không được để trống." }, { status: 400 });
  if (!body.phone) return NextResponse.json({ error: "Số điện thoại không được để trống." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("customers")
    .upsert({ ...body, sales_owner_id: staff.context.userId }, { onConflict: "phone" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}
