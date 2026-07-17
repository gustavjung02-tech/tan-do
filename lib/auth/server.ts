import { supabaseAdmin } from "@/lib/supabase/admin";

export type AppRole = "customer" | "sales";

export type AuthProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
};

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthContext = {
  userId: string;
  email?: string;
  profile: AuthProfile;
};

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  if (!supabaseAdmin) return null;

  const token = getBearerToken(request);
  if (!token) return null;

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) return null;

  return {
    id: user.id,
    email: user.email ?? undefined,
  };
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  if (!supabaseAdmin) return null;

  const user = await getAuthUser(request);
  if (!user) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,phone,role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    userId: user.id,
    email: user.email,
    profile: profile as AuthProfile,
  };
}

export async function requireAuth(request: Request) {
  const context = await getAuthContext(request);
  if (!context) {
    return { ok: false as const, status: 401, message: "Anh cần đăng nhập để tiếp tục." };
  }
  return { ok: true as const, context };
}

export async function requireStaff(request: Request) {
  const context = await getAuthContext(request);
  if (!context) {
    return { ok: false as const, status: 401, message: "Anh cần đăng nhập tài khoản sales." };
  }

  if (context.profile.role !== "sales") {
    return { ok: false as const, status: 403, message: "Tài khoản này không có quyền sales." };
  }

  return { ok: true as const, context };
}