import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfileBody = {
  fullName?: string;
  phone?: string;
};

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
  const resolvedFullName = trimmedFullName || user.email || "Khách Tân Đô";
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
      })
      .select("id,full_name,phone,role")
      .single();

    if (error) {
      return NextResponse.json({ error: `Không tạo được hồ sơ: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  }

  const updateFields: Record<string, string | null> = {};
  if (trimmedFullName) {
    updateFields.full_name = trimmedFullName;
  }
  if (trimmedPhone) {
    updateFields.phone = trimmedPhone;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ profile: existingProfile });
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