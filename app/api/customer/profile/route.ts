import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import vietnamAdminUnitsData from "@/data/vietnam-admin-units.json";

type VietnamWard = {
  code: string | number;
  name: string;
  province_code?: string | number;
};

type VietnamProvince = {
  code: string | number;
  name: string;
  wards: VietnamWard[];
};

type CustomerProfileBody = {
  name?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  area?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  provinceCode?: string | number | null;
  wardCode?: string | number | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const vietnamAdminUnits = vietnamAdminUnitsData as VietnamProvince[];

function normalizeText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCode(value?: string | number | null) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function resolveLocation(provinceCode?: string | number | null, wardCode?: string | number | null) {
  const normalizedProvinceCode = normalizeCode(provinceCode);
  const normalizedWardCode = normalizeCode(wardCode);

  if (!normalizedProvinceCode || !normalizedWardCode) {
    return { error: "Tỉnh/thành phố và xã/phường/đặc khu là bắt buộc." };
  }

  const province = vietnamAdminUnits.find((item) => String(item.code) === normalizedProvinceCode);
  if (!province) {
    return { error: "Tỉnh/thành phố không tồn tại trong dữ liệu hành chính." };
  }

  const ward = province.wards.find((item) => String(item.code) === normalizedWardCode);
  if (!ward) {
    return { error: "Xã/phường/đặc khu không tồn tại trong dữ liệu hành chính." };
  }

  if (String(ward.province_code ?? province.code) !== normalizedProvinceCode) {
    return { error: "Xã/phường/đặc khu không thuộc tỉnh/thành phố đã chọn." };
  }

  return { province, ward, provinceCode: normalizedProvinceCode, wardCode: normalizedWardCode };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { data } = await supabaseAdmin!.from("customers").select("*").eq("auth_user_id", auth.context.userId).maybeSingle();
  return NextResponse.json({ customer: data });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as CustomerProfileBody;
  const location = resolveLocation(body.provinceCode, body.wardCode);
  if ("error" in location) {
    return NextResponse.json({ error: location.error }, { status: 400 });
  }

  const customer = {
    auth_user_id: auth.context.userId,
    name: normalizeText(body.name) ?? auth.context.profile.full_name ?? "",
    phone: normalizeText(body.phone) ?? auth.context.profile.phone ?? "",
    email: auth.context.email ?? null,
    address: normalizeText(body.address),
    area: normalizeText(body.area),
    ward: location.ward.name,
    district: null,
    province: location.province.name,
    province_code: location.provinceCode,
    ward_code: location.wardCode,
    contact_person: normalizeText(body.contactPerson),
    note: normalizeText(body.note),
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
  };

  const { data, error } = await supabaseAdmin!.from("customers").upsert(customer, { onConflict: "auth_user_id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

