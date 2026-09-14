-- ============================================================
-- Ajuste al modelo de tarifas de designaciones, a partir de los
-- aranceles reales (LFF y Federativos):
--
-- 1. LFF y Federativos cobran distinto para categorías de nombre
--    parecido (ej. "SUB 13" en LFF vs "SUB 13 - Infantiles" en
--    Federativos), así que la tarifa se guarda por competencia +
--    categoría, no por categoría sola.
-- 2. En la realidad árbitro 1 y árbitro 2 cobran lo mismo (no hay
--    tarifa distinta por posición): se simplifica a un solo monto.
-- 3. Excepción real: Pre-mini/Mini (U9/U11 en LFF) se paga un monto
--    TOTAL por partido que se reparte entre los árbitros que
--    efectivamente asistieron (1 o 2). Se modela con un "modo".
-- 4. Viáticos: se cobran en cancha, en efectivo, por localidad. Son
--    solo informativos (no se suman al total que calcula la app).
-- ============================================================

drop table if exists public.tarifas_categoria cascade;

create table public.tarifas_categoria (
  competencia text not null,
  categoria text not null,
  modo text not null default 'por_arbitro' check (modo in ('por_arbitro', 'total_partido')),
  monto_arbitro numeric(10,2) not null default 0,
  monto_ct numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (competencia, categoria)
);

alter table public.tarifas_categoria enable row level security;

drop policy if exists tarifas_categoria_select on public.tarifas_categoria;
create policy tarifas_categoria_select on public.tarifas_categoria
  for select using (public.is_approved());

drop policy if exists tarifas_categoria_insert on public.tarifas_categoria;
create policy tarifas_categoria_insert on public.tarifas_categoria
  for insert with check (public.is_coordinador());

drop policy if exists tarifas_categoria_update on public.tarifas_categoria;
create policy tarifas_categoria_update on public.tarifas_categoria
  for update using (public.is_coordinador()) with check (public.is_coordinador());

drop policy if exists tarifas_categoria_delete on public.tarifas_categoria;
create policy tarifas_categoria_delete on public.tarifas_categoria
  for delete using (public.is_coordinador());

create table if not exists public.viaticos_localidad (
  localidad text primary key,
  monto numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.viaticos_localidad enable row level security;

drop policy if exists viaticos_localidad_select on public.viaticos_localidad;
create policy viaticos_localidad_select on public.viaticos_localidad
  for select using (public.is_approved());

drop policy if exists viaticos_localidad_insert on public.viaticos_localidad;
create policy viaticos_localidad_insert on public.viaticos_localidad
  for insert with check (public.is_coordinador());

drop policy if exists viaticos_localidad_update on public.viaticos_localidad;
create policy viaticos_localidad_update on public.viaticos_localidad
  for update using (public.is_coordinador()) with check (public.is_coordinador());

drop policy if exists viaticos_localidad_delete on public.viaticos_localidad;
create policy viaticos_localidad_delete on public.viaticos_localidad
  for delete using (public.is_coordinador());

alter table public.designaciones add column if not exists localidad text;
