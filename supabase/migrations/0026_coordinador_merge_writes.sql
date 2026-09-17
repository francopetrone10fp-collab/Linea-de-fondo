-- ============================================================
-- Le faltaba permiso al coordinador para escribir en disponibilidades y
-- designacion_confirmaciones ajenas — necesario para que la fusión de
-- árbitros duplicados (mergeReferees) pueda reasignar esas filas del
-- duplicado al árbitro correcto en vez de fallar en silencio por RLS
-- (la fila simplemente no se actualizaba, sin ningún error visible).
-- ============================================================

drop policy if exists disponibilidades_update on public.disponibilidades;
create policy disponibilidades_update on public.disponibilidades
  for update using (referee_id = public.my_referee_id() or public.is_coordinador())
  with check (referee_id = public.my_referee_id() or public.is_coordinador());

drop policy if exists disponibilidades_delete on public.disponibilidades;
create policy disponibilidades_delete on public.disponibilidades
  for delete using (referee_id = public.my_referee_id() or public.is_coordinador());

drop policy if exists designacion_confirmaciones_update on public.designacion_confirmaciones;
create policy designacion_confirmaciones_update on public.designacion_confirmaciones
  for update using (
    public.is_coordinador()
    or (
      referee_id = public.my_referee_id()
      and exists (
        select 1 from public.designacion_arbitros da
        where da.designacion_id = designacion_confirmaciones.designacion_id
          and da.referee_id = public.my_referee_id()
      )
    )
  )
  with check (
    public.is_coordinador()
    or (
      referee_id = public.my_referee_id()
      and exists (
        select 1 from public.designacion_arbitros da
        where da.designacion_id = designacion_confirmaciones.designacion_id
          and da.referee_id = public.my_referee_id()
      )
    )
  );
