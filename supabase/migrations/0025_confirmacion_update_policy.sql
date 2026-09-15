-- ============================================================
-- Bug real encontrado: designacion_confirmaciones tenía políticas de
-- select/insert/delete, pero ninguna de UPDATE. La app confirma con un
-- upsert (insert ... on conflict do update), así que cuando ya existía
-- una fila de confirmación para ese (designacion_id, referee_id) —por
-- ejemplo, las que se cargaron con el backfill retroactivo de
-- designaciones viejas— el upsert intentaba un UPDATE, RLS lo
-- rechazaba sin RLS que lo permita, y el árbitro no podía volver a
-- confirmar (fallaba en silencio, sin mensaje de error visible).
-- ============================================================

drop policy if exists designacion_confirmaciones_update on public.designacion_confirmaciones;
create policy designacion_confirmaciones_update on public.designacion_confirmaciones
  for update using (
    referee_id = public.my_referee_id()
    and exists (
      select 1 from public.designacion_arbitros da
      where da.designacion_id = designacion_confirmaciones.designacion_id
        and da.referee_id = public.my_referee_id()
    )
  )
  with check (
    referee_id = public.my_referee_id()
    and exists (
      select 1 from public.designacion_arbitros da
      where da.designacion_id = designacion_confirmaciones.designacion_id
        and da.referee_id = public.my_referee_id()
    )
  );
