alter table public.customers
  add column if not exists province_code text,
  add column if not exists ward_code text;
