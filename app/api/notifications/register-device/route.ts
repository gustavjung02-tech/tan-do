import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RegisterDeviceBody = {
  onesignalId?: string | null;
  subscriptionId?: string | null;
  permission?: string | null;
  optedIn?: boolean | null;
};

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase server." }, { status: 500 });
  }

  const body = await request.json() as RegisterDeviceBody;
  const subscriptionId = body.subscriptionId?.trim();
  const onesignalId = body.onesignalId?.trim() || null;

  if (!subscriptionId) {
    return NextResponse.json({ error: "Thiếu OneSignal subscription id." }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent");

  const { data, error } = await supabaseAdmin
    .from("notification_subscriptions")
    .upsert({
      user_id: auth.context.userId,
      role: auth.context.profile.role,
      onesignal_id: onesignalId,
      subscription_id: subscriptionId,
      permission: body.permission ?? null,
      opted_in: body.optedIn ?? true,
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,subscription_id" })
    .select("id,user_id,role,subscription_id,last_seen_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscription: data });
}
