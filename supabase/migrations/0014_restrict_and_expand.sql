-- Dos ajustes de permisos/datos que no tienen relación entre sí pero son
-- chicos, así que van en la misma migración:

-- 1) Solo Coordinador General puede crear competencias (antes cualquier
--    usuario aprobado podía, vía RLS). El botón ya se oculta en la UI para
--    Instructor/Árbitro, pero la fila de fondo es RLS: sin este cambio,
--    alguien podría insertar igual pegándole directo a la API.
drop policy if exists competitions_insert on public.competitions;
create policy competitions_insert on public.competitions
  for insert with check (public.is_coordinador());

-- 2) Dos tipos de silbato nuevos: "No Call ✓" (correcto no cobrar) y
--    "No Call ✗" (incorrecto no haber cobrado). Los check constraints no se
--    pueden alterar in-place, hay que sacar el viejo y poner el nuevo.
alter table public.clips drop constraint if exists clips_whistle_type_check;
alter table public.clips
  add constraint clips_whistle_type_check check (whistle_type in ('QW','IW','PW','CW','NCC','NCI'));
