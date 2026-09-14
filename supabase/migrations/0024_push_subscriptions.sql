-- ============================================================
-- Suscripciones a notificaciones push del navegador: una fila por
-- dispositivo/navegador que activó las notificaciones. El endpoint es
-- único (lo entrega el navegador al suscribirse). El envío real lo hace
-- el backend con la service_role key (el cron de recordatorios), así que
-- acá solo hace falta que cada usuario pueda gestionar sus propias filas.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_id_idx on public.push_subscriptions(profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select using (profile_id = auth.uid());

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert with check (profile_id = auth.uid());

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete using (profile_id = auth.uid());
