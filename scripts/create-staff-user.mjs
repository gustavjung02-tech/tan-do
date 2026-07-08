import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "node:fs";

function readEnv(path) {
  const env = {};
  if (!fs.existsSync(path)) return env;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = { ...readEnv(".env.local"), ...process.env };
const email = env.STAFF_EMAIL;
const password = env.STAFF_PASSWORD;
const fullName = env.STAFF_FULL_NAME ?? "Sales Tân Đô";
const phone = env.STAFF_PHONE ?? null;
const role = env.STAFF_ROLE ?? "sales";

if (!email || !password) {
  throw new Error("Thiếu STAFF_EMAIL hoặc STAFF_PASSWORD.");
}

if (!["sales", "admin"].includes(role)) {
  throw new Error("STAFF_ROLE chỉ nhận sales hoặc admin.");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: fullName,
    phone,
    role,
  },
});

if (createError && !createError.message.toLowerCase().includes("already")) {
  throw createError;
}

let userId = created.user?.id;

if (!userId) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  userId = users.users.find((user) => user.email === email)?.id;
}

if (!userId) throw new Error("Không tìm thấy user sau khi tạo.");

const { error: profileError } = await supabase
  .from("profiles")
  .upsert({
    id: userId,
    full_name: fullName,
    phone,
    role,
  }, { onConflict: "id" });

if (profileError) throw profileError;

console.log(JSON.stringify({ ok: true, email, role, userId }, null, 2));