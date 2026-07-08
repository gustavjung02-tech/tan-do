alter table public.customers add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists customers_auth_user_id_key on public.customers(auth_user_id) where auth_user_id is not null;
