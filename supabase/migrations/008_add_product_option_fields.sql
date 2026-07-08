alter table public.products
  add column if not exists industry text,
  add column if not exists source_group text,
  add column if not exists price_mode text not null default 'fixed',
  add column if not exists price_label text,
  add column if not exists option_groups jsonb not null default '[]'::jsonb,
  add column if not exists variant_keys text[] not null default array[]::text[];

create index if not exists products_industry_idx on public.products(industry);
create index if not exists products_source_group_idx on public.products(source_group);
