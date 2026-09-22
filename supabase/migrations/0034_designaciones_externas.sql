-- ============================================================
-- Partidos que un árbitro dirige por fuera del circuito de Designaciones
-- de esta liga (otro torneo, otra asociación, selección, etc.), que carga
-- él mismo para tener un control mensual de todo en un solo lugar. Es un
-- registro puramente personal — no pasa por el coordinador ni por RLS de
-- coordinador, cada árbitro ve y gestiona solo lo suyo.
-- ============================================================

create table if not exists public.designaciones_externas (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.referees(id) on delete cascade,
  fecha date not null,
  hora time,
  competencia text,
  categoria text,
  descripcion text not null,
  monto numeric not null default 0,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists designaciones_externas_referee_fecha_idx on public.designaciones_externas (referee_id, fecha);

alter table public.designaciones_externas enable row level security;

create policy designaciones_externas_select on public.designaciones_externas
  for select using (referee_id = public.my_referee_id());

create policy designaciones_externas_insert on public.designaciones_externas
  for insert with check (referee_id = public.my_referee_id());

create policy designaciones_externas_update on public.designaciones_externas
  for update using (referee_id = public.my_referee_id())
  with check (referee_id = public.my_referee_id());

create policy designaciones_externas_delete on public.designaciones_externas
  for delete using (referee_id = public.my_referee_id());
