create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_key text not null,
  sku text,
  options jsonb not null default '{}'::jsonb,
  price numeric not null default 0,
  image_key text,
  created_at timestamptz not null default now(),
  unique(product_id, variant_key)
);

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

alter table public.product_variants enable row level security;

create policy "public read product variants" on public.product_variants
for select using (true);
