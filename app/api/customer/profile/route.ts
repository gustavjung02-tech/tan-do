import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({error: auth.message},{status:auth.status});
  const {data}=await supabaseAdmin!.from("customers").select("*").eq("auth_user_id",auth.context.userId).maybeSingle();
  return NextResponse.json({customer:data});
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({error: auth.message},{status:auth.status});
  const body=await request.json();
  const customer={auth_user_id:auth.context.userId,name:body.name||auth.context.profile.full_name||"",phone:body.phone||auth.context.profile.phone||"",email:auth.context.email||null,address:body.address||null,area:body.area||null,ward:body.ward||null,district:body.district||null,province:body.province||null,contact_person:body.contactPerson||null,note:body.note||null,latitude:body.latitude||null,longitude:body.longitude||null};
  const {data,error}=await supabaseAdmin!.from("customers").upsert(customer,{onConflict:"auth_user_id"}).select().single();
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({customer:data});
}

