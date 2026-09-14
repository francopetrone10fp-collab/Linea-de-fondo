-- Permite que un árbitro vea con quién dirigió un partido (nombre de sus
-- compañeros de terna), sin exponer lo que cobra cada uno: designacion_arbitros
-- ya restringe el SELECT directo a la propia fila, así que esto se resuelve
-- con una función SECURITY DEFINER que solo devuelve nombre + posición (nunca
-- monto), y solo para partidos donde quien pregunta también fue designado
-- (o es coordinador).
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
    and (
      public.is_coordinador()
      or exists (
        select 1 from public.designacion_arbitros mine
        where mine.designacion_id = da.designacion_id
          and mine.referee_id = public.my_referee_id()
      )
    );
$$;
