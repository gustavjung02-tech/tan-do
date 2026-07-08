alter table public.orders
  add column if not exists client_request_id text;

create unique index if not exists orders_customer_client_request_id_uidx
  on public.orders(customer_id, client_request_id)
  where customer_id is not null and client_request_id is not null;
