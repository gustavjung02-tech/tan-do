import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OrderItemRow = {
  product_name: string;
  unit_price: number | string;
  quantity: number | string;
  line_total: number | string;
};

type OrderRow = {
  code: string;
  customer_name: string | null;
  customer_phone: string | null;
  source: "customer" | "sales_manual";
  status: string;
  customer_note: string | null;
  sales_note: string | null;
  total: number | string;
  created_at: string;
  order_items?: OrderItemRow[];
};

const statusText: Record<string, string> = {
  new: "Mới",
  confirmed: "Đã nhận",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const sourceText: Record<string, string> = {
  customer: "Khách đặt",
  sales_manual: "Sales tạo",
};

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export async function GET(request: Request) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "Mã đơn hàng",
    "Ngày tạo",
    "Tên khách",
    "Số điện thoại",
    "Trạng thái",
    "Nguồn đơn",
    "Tên sản phẩm",
    "Số lượng",
    "Đơn giá",
    "Thành tiền",
    "Tổng đơn",
    "Ghi chú khách",
    "Ghi chú sales",
  ];

  const rows = [headers.map(csvCell).join(",")];

  for (const order of (data ?? []) as OrderRow[]) {
    const items = order.order_items?.length ? order.order_items : [{ product_name: "", unit_price: "", quantity: "", line_total: "" }];
    for (const item of items) {
      rows.push([
        order.code,
        formatDate(order.created_at),
        order.customer_name,
        order.customer_phone,
        statusText[order.status] ?? order.status,
        sourceText[order.source] ?? order.source,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.line_total,
        order.total,
        order.customer_note,
        order.sales_note,
      ].map(csvCell).join(","));
    }
  }

  const csv = `\uFEFF${rows.join("\r\n")}`;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bao-cao-don-hang-${today}.csv"`,
    },
  });
}