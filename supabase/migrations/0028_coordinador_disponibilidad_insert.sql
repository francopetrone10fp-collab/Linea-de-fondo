-- ============================================================
-- El coordinador general necesita poder cargar/editar la disponibilidad de
-- cualquier árbitro, no solo la propia (por ejemplo, cuando un árbitro no
-- puede o no sabe cargarla solo). UPDATE/DELETE ya se lo permitían desde la
-- migración 0026, pero INSERT se había quedado afuera: si el árbitro todavía
-- no tenía ninguna fila para esa fecha, el upsert del coordinador fallaba en
-- silencio por RLS.
-- ============================================================

drop policy if exists disponibilidades_insert on public.disponibilidades;
create policy disponibilidades_insert on public.disponibilidades
  for insert with check (referee_id = public.my_referee_id() or public.is_coordinador());
