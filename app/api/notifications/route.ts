import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request){
 const auth=await requireAuth(request);
 if(!auth.ok)return NextResponse.json({error:auth.message},{status:auth.status});
 const {data}=await supabaseAdmin!.from("notifications").select("*").eq("user_id",auth.context.userId).order("created_at",{ascending:false}).limit(50);
 return NextResponse.json({notifications:data??[],unreadCount:(data??[]).filter(n=>!n.read_at).length});
}
export async function PATCH(request: Request){
 const auth=await requireAuth(request);
 if(!auth.ok)return NextResponse.json({error:auth.message},{status:auth.status});
 const body=await request.json();
 let query=supabaseAdmin!.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",auth.context.userId);
 if(body.id) query=query.eq("id",body.id);
 const {error}=await query;
 return NextResponse.json({ok:!error,error:error?.message});
}
