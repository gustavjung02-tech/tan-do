create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  name text not null,
  phone text not null,
  email text,
  address text,
  area text,
  ward text,
  district text,
  province text,
  contact_person text,
  note text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  sales_owner_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_unique unique (phone)
);

create index if not exists customers_name_idx on public.customers using gin (to_tsvector('simple', name));
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_area_idx on public.customers(area);
create index if not exists customers_sales_owner_id_idx on public.customers(sales_owner_id);
create index if not exists customers_is_active_idx on public.customers(is_active);

create or replace trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

drop policy if exists "customers_staff_select" on public.customers;
create policy "customers_staff_select"
on public.customers
for select
using (public.current_user_role() in ('sales', 'admin'));

drop policy if exists "customers_staff_insert" on public.customers;
create policy "customers_staff_insert"
on public.customers
for insert
with check (public.current_user_role() in ('sales', 'admin'));

drop policy if exists "customers_staff_update" on public.customers;
create policy "customers_staff_update"
on public.customers
for update
using (public.current_user_role() in ('sales', 'admin'))
with check (public.current_user_role() in ('sales', 'admin'));

drop policy if exists "customers_admin_delete" on public.customers;
create policy "customers_admin_delete"
on public.customers
for delete
using (public.current_user_role() = 'admin');
