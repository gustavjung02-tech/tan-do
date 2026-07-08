import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseAdminEnv() {
  return Boolean(supabaseUrl && supabaseSecretKey);
}

export const supabaseAdmin = hasSupabaseAdminEnv()
  ? createClient(supabaseUrl!, supabaseSecretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws as any,
      },
    })
  : null;