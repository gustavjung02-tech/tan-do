alter table public.orders
  add column if not exists customer_record_id uuid references public.customers(id) on delete set null;

create index if not exists orders_customer_record_id_idx on public.orders(customer_record_id);

update public.orders o
set customer_record_id = c.id
from public.customers c
where o.customer_record_id is null
  and regexp_replace(coalesce(o.customer_phone, ''), '[^0-9+]', '', 'g') = regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g');
