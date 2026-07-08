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

  const body = await request.json() as ProfileBody;
  const fullName = body.fullName?.trim() || user.email || "Khách Tân Đô";
  const phone = body.phone?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: fullName,
      phone,
      role: "customer",
    }, { onConflict: "id" })
    .select("id,full_name,phone,role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}