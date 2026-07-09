alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists sku text;
alter table public.order_items add column if not exists options jsonb;
