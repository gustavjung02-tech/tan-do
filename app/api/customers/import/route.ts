import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { cleanCustomerInput } from "@/lib/services/customers";
import { supabaseAdmin } from "@/lib/supabase/admin";

const HEADER_MAP: Record<string, string> = {
  customer_code: "customerCode",
  ma_khach: "customerCode",
  mã_khách: "customerCode",
  code: "customerCode",
  name: "name",
  ten_khach: "name",
  tên_khách: "name",
  phone: "phone",
  sdt: "phone",
  so_dien_thoai: "phone",
  số_điện_thoại: "phone",
  email: "email",
  address: "address",
  dia_chi: "address",
  địa_chỉ: "address",
  area: "area",
  khu_vuc: "area",
  khu_vực: "area",
  ward: "ward",
  phuong: "ward",
  phường: "ward",
  district: "district",
  quan: "district",
  quận: "district",
  province: "province",
  tinh: "province",
  tỉnh: "province",
  contact_person: "contactPerson",
  nguoi_lien_he: "contactPerson",
  người_liên_hệ: "contactPerson",
  note: "note",
  ghi_chu: "note",
  ghi_chú: "note",
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lng: "longitude",
  lon: "longitude",
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\n") && !quoted) {
      if (char === "\n" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff.ok) return NextResponse.json({ error: staff.message }, { status: staff.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const text = await request.text();
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length < 2) return NextResponse.json({ error: "File CSV cần có dòng tiêu đề và ít nhất một khách." }, { status: 400 });

  const headers = rows[0].map((header) => HEADER_MAP[normalizeHeader(header)] ?? normalizeHeader(header));
  const payload = rows.slice(1).map((cells) => {
    const input: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) input[header] = cells[index] ?? "";
    });
    return { ...cleanCustomerInput(input), sales_owner_id: staff.context.userId };
  }).filter((customer) => customer.name && customer.phone);

  if (payload.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy dòng khách hợp lệ. Cần có name và phone." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .upsert(payload, { onConflict: "phone" })
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imported: data?.length ?? payload.length, skipped: rows.length - 1 - payload.length });
}
