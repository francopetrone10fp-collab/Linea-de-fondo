-- ============================================================
-- Confirmación de designación por parte del árbitro:
-- - Se agrega el estado 'confirmado' (se pone solo cuando TODOS los
--   árbitros asignados a esa designación confirmaron).
-- - requiere_confirmacion marca si esa designación pasa por este
--   flujo nuevo. Todo lo que ya estaba cargado queda en false (se
--   considera confirmado de antes, no hace falta que nadie confirme
--   nada); de acá en más, toda designación nueva nace en true.
-- - designacion_confirmaciones: una fila por árbitro que confirmó,
--   mismo patrón que partido_reads.
-- ============================================================

alter table public.designaciones drop constraint if exists designaciones_estado_check;
alter table public.designaciones add constraint designaciones_estado_check
  check (estado in ('programado', 'confirmar', 'suspendido', 'jugado', 'confirmado'));

alter table public.designaciones add column if not exists requiere_confirmacion boolean not null default true;

-- Todo lo que ya existía a esta fecha se considera confirmado de antes.
update public.designaciones set requiere_confirmacion = false where requiere_confirmacion = true;

create table if not exists public.designacion_confirmaciones (
  designacion_id uuid not null references public.designaciones(id) on delete cascade,
  referee_id uuid not null references public.referees(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (designacion_id, referee_id)
);

alter table public.designacion_confirmaciones enable row level security;

-- Cualquier árbitro asignado a la designación puede ver quién confirmó
-- (no es información sensible, a diferencia del monto).
drop policy if exists designacion_confirmaciones_select on public.designacion_confirmaciones;
create policy designacion_confirmaciones_select on public.designacion_confirmaciones
  for select using (
    public.is_coordinador()
    or exists (
      select 1 from public.designacion_arbitros mine
      where mine.designacion_id = designacion_confirmaciones.designacion_id
        and mine.referee_id = public.my_referee_id()
    )
  );

-- Un árbitro solo puede confirmar su propia designación (tiene que estar
-- efectivamente asignado a ese partido).
drop policy if exists designacion_confirmaciones_insert on public.designacion_confirmaciones;
create policy designacion_confirmaciones_insert on public.designacion_confirmaciones
  for insert with check (
    referee_id = public.my_referee_id()
    and exists (
      select 1 from public.designacion_arbitros da
      where da.designacion_id = designacion_confirmaciones.designacion_id
        and da.referee_id = public.my_referee_id()
    )
  );

-- Solo coordinador puede deshacer una confirmación (corrección manual).
drop policy if exists designacion_confirmaciones_delete on public.designacion_confirmaciones;
create policy designacion_confirmaciones_delete on public.designacion_confirmaciones
  for delete using (public.is_coordinador());
