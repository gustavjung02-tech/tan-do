-- Link customer orders to Supabase Auth profiles.

alter table public.orders
  add column if not exists customer_id uuid references public.profiles(id) on delete set null;

create index if not exists orders_customer_id_idx on public.orders(customer_id);