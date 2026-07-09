import { supabaseAdmin } from "@/lib/supabase/admin";

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

type AppRole = "customer" | "sales" | "admin";

type SendNotificationInput = {
  userIds: string[];
  title: string;
  message: string;
  url?: string;
  data?: Record<string, string | number | boolean | null>;
};

type NotificationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
  response?: unknown;
};


function getAppBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  return (configuredUrl ?? vercelUrl)?.replace(/\/$/, "");
}

function toNotificationUrl(path?: string) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) return undefined;

  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export async function getNotificationUserIdsByRoles(roles: AppRole[]) {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("role", roles);

  if (error) {
    console.error("Failed to load notification users", error);
    return [];
  }

  return uniqueIds((data ?? []).map((profile) => profile.id as string));
}


export async function createNotification(input: {userIds:string[];title:string;message:string;type?:string;url?:string;data?:Record<string,unknown>}) {
  if (!supabaseAdmin || input.userIds.length===0) return;
  await supabaseAdmin.from("notifications").insert(input.userIds.map(user_id => ({user_id,title:input.title,message:input.message,type:input.type??"system",url:input.url,data:input.data??{}})));
}

export async function sendOneSignalNotification(input: SendNotificationInput): Promise<NotificationResult> {
  const appId = process.env.ONESIGNAL_APP_ID ?? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  const userIds = uniqueIds(input.userIds);

  if (!appId || !restApiKey) {
    return { ok: false, skipped: true, reason: "missing_onesignal_env" };
  }

  if (userIds.length === 0) {
    return { ok: false, skipped: true, reason: "empty_recipients" };
  }

  const response = await fetch(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Key ${restApiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      include_aliases: {
        external_id: userIds,
      },
      target_channel: "push",
      headings: { en: input.title },
      contents: { en: input.message },
      url: toNotificationUrl(input.url),
      data: input.data,
    }),
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error("OneSignal notification failed", { status: response.status, payload });
    return { ok: false, status: response.status, response: payload };
  }

  return { ok: true, status: response.status, response: payload };
}

export async function notifyStaffAboutNewOrder(order: {
  id: string;
  code: string;
  customer_name?: string | null;
  total?: number | string | null;
}) {
  const staffIds = await getNotificationUserIdsByRoles(["sales", "admin"]);
  await createNotification({ userIds: staffIds, title: `??n m?i ${order.code}`, message: `${order.customer_name ?? "Kh?ch h?ng"} v?a g?i ??n m?i.`, type:"new_order", url:`/sales/orders/${order.id}` });
  return sendOneSignalNotification({
    userIds: staffIds,
    title: `ÄÆ¡n má»›i ${order.code}`,
    message: `${order.customer_name ?? "KhÃ¡ch hÃ ng"} vá»«a gá»­i Ä‘Æ¡n má»›i.`,
    url: `/sales/orders/${order.id}`,
    data: {
      type: "new_order",
      orderId: order.id,
      orderCode: order.code,
    },
  });
}

const statusLabels: Record<string, string> = {
  new: "má»›i",
  confirmed: "Ä‘Ã£ xÃ¡c nháº­n",
  processing: "Ä‘ang xá»­ lÃ½",
  completed: "Ä‘Ã£ hoÃ n táº¥t",
  cancelled: "Ä‘Ã£ há»§y",
};

export async function notifyCustomerAboutOrderStatus(order: {
  id: string;
  code: string;
  customer_id?: string | null;
  status: string;
}) {
  if (!order.customer_id) {
    return { ok: false, skipped: true, reason: "order_has_no_customer" } satisfies NotificationResult;
  }

  return sendOneSignalNotification({
    userIds: [order.customer_id],
    title: `Cáº­p nháº­t Ä‘Æ¡n ${order.code}`,
    message: `ÄÆ¡n hÃ ng cá»§a anh ${statusLabels[order.status] ?? order.status}.`,
    url: `/customer/orders/${order.id}`,
    data: {
      type: "order_status_changed",
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
    },
  });
}

