-- Add source fields for importing readable product catalog from R2 manifests.

alter table public.products
  add column if not exists brand text,
  add column if not exists category text,
  add column if not exists source_catalog text,
  add column if not exists source_key text;

create unique index if not exists products_source_catalog_key_idx
  on public.products(source_catalog, source_key)
  where source_catalog is not null and source_key is not null;

create index if not exists products_category_idx on public.products(category);