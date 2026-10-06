-- ============================================================
-- Montos manuales para la pantalla de Liquidaciones: partidos o pagos que
-- no pasaron por el flujo normal de Designaciones (un amistoso cargado
-- tarde, una corrección, un extra puntual) pero que igual tienen que sumar
-- al total de un árbitro. Solo lo ve/gestiona el coordinador general —no
-- es información que le llegue al árbitro en ningún otro lado de la app.
-- ============================================================

create table if not exists public.liquidaciones_manuales (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.referees(id) on delete cascade,
  fecha date not null default current_date,
  concepto text not null,
  monto numeric not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists liquidaciones_manuales_referee_idx on public.liquidaciones_manuales (referee_id, fecha);

alter table public.liquidaciones_manuales enable row level security;

create policy liquidaciones_manuales_select on public.liquidaciones_manuales
  for select using (public.is_coordinador());

create policy liquidaciones_manuales_insert on public.liquidaciones_manuales
  for insert with check (public.is_coordinador());

create policy liquidaciones_manuales_update on public.liquidaciones_manuales
  for update using (public.is_coordinador()) with check (public.is_coordinador());

create policy liquidaciones_manuales_delete on public.liquidaciones_manuales
  for delete using (public.is_coordinador());
