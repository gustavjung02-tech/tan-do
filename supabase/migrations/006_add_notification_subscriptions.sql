create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('customer', 'sales', 'admin')),
  onesignal_id text,
  subscription_id text not null,
  permission text,
  opted_in boolean not null default true,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subscription_id)
);

create index if not exists notification_subscriptions_user_id_idx
  on public.notification_subscriptions(user_id);

create index if not exists notification_subscriptions_role_idx
  on public.notification_subscriptions(role);

create index if not exists notification_subscriptions_subscription_id_idx
  on public.notification_subscriptions(subscription_id);

drop trigger if exists set_notification_subscriptions_updated_at on public.notification_subscriptions;
create trigger set_notification_subscriptions_updated_at
before update on public.notification_subscriptions
for each row execute function public.set_updated_at();

alter table public.notification_subscriptions enable row level security;

drop policy if exists "notification_subscriptions_select_own_or_staff" on public.notification_subscriptions;
create policy "notification_subscriptions_select_own_or_staff"
on public.notification_subscriptions
for select
using (
  user_id = auth.uid()
  or public.current_user_role() in ('sales', 'admin')
);

drop policy if exists "notification_subscriptions_insert_own" on public.notification_subscriptions;
create policy "notification_subscriptions_insert_own"
on public.notification_subscriptions
for insert
with check (user_id = auth.uid());

drop policy if exists "notification_subscriptions_update_own" on public.notification_subscriptions;
create policy "notification_subscriptions_update_own"
on public.notification_subscriptions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
