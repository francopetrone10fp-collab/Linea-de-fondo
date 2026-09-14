-- Cuando un árbitro confirma su designación, hay que poder poner el
-- estado de la designación en 'confirmado' si ya confirmaron todos los
-- asignados. Pero designaciones_update es coordinador-only por RLS (el
-- árbitro no puede tocar ese campo directo), así que este chequeo +
-- update va en una función SECURITY DEFINER: el árbitro llama la función
-- después de insertar su confirmación, y acá adentro sí se le permite
-- poner el estado en 'confirmado' (nunca otra cosa).
create or replace function public.recalcular_confirmacion_designacion(p_designacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_asignados int;
  v_pendientes int;
begin
  if not (
    public.is_coordinador()
    or exists (
      select 1 from public.designacion_arbitros da
      where da.designacion_id = p_designacion_id and da.referee_id = public.my_referee_id()
    )
  ) then
    return;
  end if;

  select estado into v_estado from public.designaciones where id = p_designacion_id;
  if v_estado is null or v_estado in ('suspendido', 'jugado') then
    return;
  end if;

  select count(*) into v_asignados
  from public.designacion_arbitros
  where designacion_id = p_designacion_id;
  if v_asignados = 0 then
    return;
  end if;

  select count(*) into v_pendientes
  from public.designacion_arbitros da
  where da.designacion_id = p_designacion_id
    and not exists (
      select 1 from public.designacion_confirmaciones dc
      where dc.designacion_id = da.designacion_id and dc.referee_id = da.referee_id
    );

  if v_pendientes = 0 then
    update public.designaciones set estado = 'confirmado' where id = p_designacion_id;
  end if;
end;
$$;
