-- ============================================================
-- Un árbitro ya no puede cargar/editar/borrar su disponibilidad de una
-- semana que ya pasó (evita reescribir disponibilidad de partidos que ya
-- se jugaron). El coordinador sigue pudiendo tocar cualquier fecha, tanto
-- en filas propias como ajenas (is_coordinador() queda como excepción
-- separada, igual que en las policies anteriores).
-- ============================================================

drop policy if exists disponibilidades_insert on public.disponibilidades;
create policy disponibilidades_insert on public.disponibilidades
  for insert with check (
    (referee_id = public.my_referee_id() and fecha >= date_trunc('week', current_date)::date)
    or public.is_coordinador()
  );

drop policy if exists disponibilidades_update on public.disponibilidades;
create policy disponibilidades_update on public.disponibilidades
  for update using (
    (referee_id = public.my_referee_id() and fecha >= date_trunc('week', current_date)::date)
    or public.is_coordinador()
  )
  with check (
    (referee_id = public.my_referee_id() and fecha >= date_trunc('week', current_date)::date)
    or public.is_coordinador()
  );

drop policy if exists disponibilidades_delete on public.disponibilidades;
create policy disponibilidades_delete on public.disponibilidades
  for delete using (
    (referee_id = public.my_referee_id() and fecha >= date_trunc('week', current_date)::date)
    or public.is_coordinador()
  );
