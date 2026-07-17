import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfileBody = {
  fullName?: string;
  phone?: string;
};

type ProfileRole = "customer" | "sales";

function normalizeEmail(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveProfileRole(email: string | null): Promise<ProfileRole> {
  if (!supabaseAdmin || !email) {
    return "customer";
  }

  const { data, error } = await supabaseAdmin
    .from("sales_accounts")
    .select("is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve sales account role", error);
    return "customer";
  }

  return data?.is_active === true ? "sales" : "customer";
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Anh cần đăng nhập để tạo hồ sơ khách." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as ProfileBody;
  const trimmedFullName = body.fullName?.trim();
  const trimmedPhone = body.phone?.trim();
  const normalizedEmail = normalizeEmail(user.email);
  const resolvedRole = await resolveProfileRole(normalizedEmail);
  const resolvedFullName = trimmedFullName || normalizedEmail || user.email || "Khách Tân Đô";
  const resolvedPhone = trimmedPhone || null;

  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,phone,role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: `Không đọc được hồ sơ: ${existingProfileError.message}` }, { status: 500 });
  }

  if (!existingProfile) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        full_name: resolvedFullName,
        phone: resolvedPhone,
        role: resolvedRole,
      })
      .select("id,full_name,phone,role")
      .single();

    if (error) {
      return NextResponse.json({ error: `Không tạo được hồ sơ: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  }

  const updateFields: Record<string, string | null> = {
    role: resolvedRole,
  };

  if (trimmedFullName) {
    updateFields.full_name = trimmedFullName;
  }
  if (trimmedPhone) {
    updateFields.phone = trimmedPhone;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updateFields)
    .eq("id", user.id)
    .select("id,full_name,phone,role")
    .single();

  if (error) {
    return NextResponse.json({ error: `Không cập nhật hồ sơ: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}