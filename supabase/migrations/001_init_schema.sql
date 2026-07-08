-- TAN-DO MVP schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

-- Roles are kept as text for MVP simplicity.
-- Valid values: customer | sales | admin
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'sales', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  unit text not null default 'cái',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid references public.profiles(id) on delete set null,
  sales_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('customer', 'sales_manual')),
  status text not null default 'new' check (status in ('new', 'confirmed', 'processing', 'completed', 'cancelled')),
  customer_note text,
  sales_note text,
  total numeric(12, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity numeric(12, 3) not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_is_active_idx on public.products(is_active);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_sales_id_idx on public.orders(sales_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_source_idx on public.orders(source);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Simple order code generator for MVP.
-- Example: TD-000001
create sequence if not exists public.order_code_seq start 1;

create or replace function public.next_order_code()
returns text
language sql
as $$
  select 'TD-' || lpad(nextval('public.order_code_seq')::text, 6, '0');
$$;

-- Keep order total consistent when called manually.
create or replace function public.recalculate_order_total(target_order_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.orders
  set total = coalesce((
    select sum(line_total)
    from public.order_items
    where order_id = target_order_id
  ), 0)
  where id = target_order_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper: check current user's role.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- PROFILES policies

drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff"
on public.profiles
for select
using (
  id = auth.uid()
  or public.current_user_role() in ('sales', 'admin')
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

-- PRODUCTS policies

drop policy if exists "products_select_active_or_staff" on public.products;
create policy "products_select_active_or_staff"
on public.products
for select
using (
  is_active = true
  or public.current_user_role() in ('sales', 'admin')
);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write"
on public.products
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- ORDERS policies

drop policy if exists "orders_select_own_or_staff" on public.orders;
create policy "orders_select_own_or_staff"
on public.orders
for select
using (
  customer_id = auth.uid()
  or sales_id = auth.uid()
  or public.current_user_role() in ('sales', 'admin')
);

drop policy if exists "orders_customer_insert_own" on public.orders;
create policy "orders_customer_insert_own"
on public.orders
for insert
with check (
  source = 'customer'
  and customer_id = auth.uid()
  and status = 'new'
);

drop policy if exists "orders_sales_insert_manual" on public.orders;
create policy "orders_sales_insert_manual"
on public.orders
for insert
with check (
  public.current_user_role() in ('sales', 'admin')
  and source = 'sales_manual'
  and status in ('confirmed', 'processing')
);

drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update"
on public.orders
for update
using (public.current_user_role() in ('sales', 'admin'))
with check (public.current_user_role() in ('sales', 'admin'));

-- ORDER ITEMS policies

drop policy if exists "order_items_select_by_order_access" on public.order_items;
create policy "order_items_select_by_order_access"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.customer_id = auth.uid()
        or o.sales_id = auth.uid()
        or public.current_user_role() in ('sales', 'admin')
      )
  )
);

drop policy if exists "order_items_customer_insert_own_new_order" on public.order_items;
create policy "order_items_customer_insert_own_new_order"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = auth.uid()
      and o.source = 'customer'
      and o.status = 'new'
  )
);

drop policy if exists "order_items_staff_insert_update" on public.order_items;
create policy "order_items_staff_insert_update"
on public.order_items
for all
using (public.current_user_role() in ('sales', 'admin'))
with check (public.current_user_role() in ('sales', 'admin'));