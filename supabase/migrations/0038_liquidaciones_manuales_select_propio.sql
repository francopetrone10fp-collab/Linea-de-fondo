-- El árbitro puede ver (solo lectura) los montos manuales que el
-- coordinador le cargó a él mismo, para que se reflejen en su propio total
-- de "Mis designaciones". Insert/update/delete siguen siendo exclusivos del
-- coordinador general (políticas ya existentes, sin cambios).
drop policy if exists liquidaciones_manuales_select on public.liquidaciones_manuales;
create policy liquidaciones_manuales_select on public.liquidaciones_manuales
  for select using (public.is_coordinador() or referee_id = public.my_referee_id());
