-- Recalcula el monto de TODAS las asignaciones según la tarifa vigente de
-- cada designación (misma lógica que ya se usaba a mano tras cada import).
-- La usa la importación masiva después de cargar muchas designaciones de
-- una vez, para no tener que recalcular partido por partido desde la app.
create or replace function public.recalcular_montos_designaciones()
returns void
language sql
security definer
set search_path = public
as $$
  update public.designacion_arbitros da
  set monto = case
    when t.modo = 'total_partido' then t.monto_arbitro / cnt.cantidad
    else t.monto_arbitro
  end
  from public.designaciones d
  join public.tarifas_categoria t on t.competencia = d.competencia and t.categoria = d.categoria
  join (
    select designacion_id, count(*) as cantidad
    from public.designacion_arbitros
    group by designacion_id
  ) cnt on cnt.designacion_id = d.id
  where da.designacion_id = d.id
    and public.is_coordinador();
$$;
