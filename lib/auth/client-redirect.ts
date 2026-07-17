import { supabaseBrowser } from "@/lib/supabase/client";

type ResolveDestinationOptions = {
  accessToken: string;
  next?: string | null;
};

function isSafeDestination(next: string | null | undefined, role: "customer" | "sales" | "admin") {
  if (!next) return true;

  const normalized = next.trim();
  if (!normalized) return true;

  if (role === "customer") {
    return normalized.startsWith("/customer");
  }

  return normalized.startsWith("/sales");
}

async function fetchProfileRole(accessToken: string) {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "Không đọc được thông tin hồ sơ.");
  }

  const payload = await response.json().catch(() => ({}));
  return payload?.profile?.role as "customer" | "sales" | "admin" | undefined;
}

async function fetchCustomerProfile(accessToken: string) {
  const response = await fetch("/api/customer/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "Không đọc được hồ sơ khách.");
  }

  const payload = await response.json().catch(() => ({}));
  return payload?.customer as {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    province?: string | null;
    ward?: string | null;
  } | null;
}

export async function resolvePostLoginDestination({ accessToken, next }: ResolveDestinationOptions) {
  if (!supabaseBrowser) {
    throw new Error("Không thể khởi tạo xác thực.");
  }

  const role = await fetchProfileRole(accessToken);

  if (role === "sales" || role === "admin") {
    return isSafeDestination(next, role) ? next || "/sales" : "/sales";
  }

  if (role === "customer") {
    const customer = await fetchCustomerProfile(accessToken);
    const isComplete = Boolean(
      customer?.name &&
      customer?.phone &&
      customer?.address &&
      customer?.province &&
      customer?.ward
    );

    if (!isComplete) {
      return "/customer/setup";
    }

    return isSafeDestination(next, role) ? next || "/customer" : "/customer";
  }

  return "/login";
}
