import type { Order } from "@/lib/mock/types";

export type DataMode = "mock" | "supabase";

export function shouldUseSupabaseOrders() {
  // Orders still run mock-local until Supabase schema exists and auth/customer model is wired.
  return false;
}

export async function createSupabaseOrderPlaceholder(_order: Order) {
  return { ok: false, reason: "Supabase orders are not wired yet." };
}