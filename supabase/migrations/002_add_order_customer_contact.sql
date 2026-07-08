-- Add readable customer contact fields directly on orders for MVP operations.
-- This keeps exported data understandable for sales/admin before full auth/customer profiles are wired.

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text;

create index if not exists orders_customer_phone_idx on public.orders(customer_phone);