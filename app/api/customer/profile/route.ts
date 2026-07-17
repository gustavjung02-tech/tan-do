import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CustomerProfileBody = {
  name?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  area?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function normalizeText(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  const customer = {
    auth_user_id: auth.context.userId,
    name: normalizeText(body.name) ?? auth.context.profile.full_name ?? "",
    phone: normalizeText(body.phone) ?? auth.context.profile.phone ?? "",
    email: auth.context.email ?? null,
    address: normalizeText(body.address),
    area: normalizeText(body.area),
    ward: normalizeText(body.ward),
    district: normalizeText(body.district),
    province: normalizeText(body.province),
    contact_person: normalizeText(body.contactPerson),
    note: normalizeText(body.note),
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
  };

  const { data, error } = await supabaseAdmin!.from("customers").upsert(customer, { onConflict: "auth_user_id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

