export type ProductVariant = {
  id?: string;
  variantKey: string;
  sku?: string;
  options: SelectedProductOptions;
  price: number;
};

export type ProductOptionGroup = {
  name: string;
  values: string[];
};

export type SelectedProductOptions = Record<string, string>;

export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  unit: string;
  imageUrl: string;
  isActive: boolean;
  brand?: string;
  category?: string;
  industry?: string;
  sourceGroup?: string;
  priceMode?: "fixed" | "market" | string;
  priceLabel?: string;
  optionGroups?: ProductOptionGroup[];
  variantKeys?: string[];
  variants?: ProductVariant[];
};

export type CartItem = {
  productId: string;
  quantity: number;
  options?: SelectedProductOptions;
};

export type OrderStatus = "new" | "confirmed" | "processing" | "completed" | "cancelled";
export type OrderSource = "customer" | "sales_manual";

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  source: OrderSource;
  status: OrderStatus;
  customerNote?: string;
  salesNote?: string;
  salesName?: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
};
