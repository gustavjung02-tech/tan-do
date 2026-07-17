create table if not exists public.sales_accounts (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
