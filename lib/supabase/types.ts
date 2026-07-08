export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number | string;
  image_url: string | null;
  unit: string;
  is_active: boolean;
  brand?: string | null;
  category?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrderRow = {
  id: string;
  code: string;
  customer_id: string | null;
  sales_id: string | null;
  source: "customer" | "sales_manual";
  status: "new" | "confirmed" | "processing" | "completed" | "cancelled";
  customer_note: string | null;
  sales_note: string | null;
  total: number | string;
  created_at: string;
  updated_at?: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number | string;
  quantity: number | string;
  line_total: number | string;
  created_at?: string;
};