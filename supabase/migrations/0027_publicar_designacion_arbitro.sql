-- ============================================================
-- Paso previo de confirmación antes de que una designación le aparezca a un
-- árbitro y le llegue la notificación push. Hasta ahora, apenas el
-- coordinador elegía un árbitro en la grilla, quedaba visible en "Mis
-- designaciones" y se notificaba al instante — sin margen para corregir un
-- error de tipeo o cambiar de idea antes de que el árbitro se entere.
--
-- `publicado` default true para no afectar filas ya existentes ni la carga
-- masiva (bulkImportDesignaciones sigue insertando ya publicado, como
-- siempre — nunca notificó y no tiene sentido agregarle un click extra por
-- fila en una planilla de decenas de partidos). El flujo interactivo de la
-- grilla (setDesignacionArbitro) es el único que ahora inserta en false, y
-- un botón "Confirmar" nuevo (confirmarArbitro) lo pasa a true recién ahí
-- se dispara la notificación.
-- ============================================================

alter table public.designacion_arbitros add column if not exists publicado boolean not null default true;

-- El árbitro solo puede ver (y por lo tanto "Mis designaciones" solo puede
-- mostrar) sus propias filas ya publicadas. El coordinador sigue viendo todo,
-- publicado o no, para poder revisar y confirmar.
drop policy if exists designacion_arbitros_select on public.designacion_arbitros;
create policy designacion_arbitros_select on public.designacion_arbitros
  for select using (
    public.is_coordinador() or (referee_id = public.my_referee_id() and publicado)
  );

-- Companeros de terna: que no se filtre el nombre de alguien todavía sin
-- confirmar, ni a los demás ni a uno mismo si su propia fila es un borrador.
create or replace function public.designaciones_companeros(p_designacion_ids uuid[])
returns table (designacion_id uuid, referee_id uuid, referee_name text, posicion smallint)
language sql
security definer
set search_path = public
stable
as $$
  select da.designacion_id, da.referee_id, r.name, da.posicion
  from public.designacion_arbitros da
  join public.referees r on r.id = da.referee_id
  where da.designacion_id = any(p_designacion_ids)
    and da.publicado
    and (
      public.is_coordinador()
      or exists (
        select 1 from public.designacion_arbitros mine
        where mine.designacion_id = da.designacion_id
          and mine.referee_id = public.my_referee_id()
          and mine.publicado
      )
    );
$$;
