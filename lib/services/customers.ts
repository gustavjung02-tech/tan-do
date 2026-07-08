export type Customer = {
  id: string;
  customer_code: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  area: string | null;
  ward: string | null;
  district: string | null;
  province: string | null;
  contact_person: string | null;
  note: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  sales_owner_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  order_count?: number;
  total_spent?: number;
  last_order_at?: string | null;
};

export type CustomerInput = {
  customerCode?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  area?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  contactPerson?: string | null;
  note?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isActive?: boolean | null;
};

export function normalizePhone(phone: string | null | undefined) {
  return String(phone ?? "").replace(/[^0-9+]/g, "").trim();
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanNumber(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function cleanCustomerInput(input: CustomerInput) {
  return {
    customer_code: cleanText(input.customerCode),
    name: cleanText(input.name) ?? "",
    phone: normalizePhone(input.phone),
    email: cleanText(input.email),
    address: cleanText(input.address),
    area: cleanText(input.area),
    ward: cleanText(input.ward),
    district: cleanText(input.district),
    province: cleanText(input.province),
    contact_person: cleanText(input.contactPerson),
    note: cleanText(input.note),
    latitude: cleanNumber(input.latitude),
    longitude: cleanNumber(input.longitude),
    is_active: input.isActive ?? true,
  };
}

export const CUSTOMER_CSV_COLUMNS = [
  "customer_code",
  "name",
  "phone",
  "email",
  "address",
  "area",
  "ward",
  "district",
  "province",
  "contact_person",
  "note",
  "latitude",
  "longitude",
] as const;
