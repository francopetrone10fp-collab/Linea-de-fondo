-- Recalcula el color de cada equipo y árbitro ya cargado en la base para que
-- adopten la paleta de insignias nueva, sin depender de una lista fija de
-- nombres (cubre también equipos/árbitros agregados a mano, no solo el seed).
-- Replica exactamente colorForTeam() de src/lib/constants.ts:
--   h = 0; para cada char: h = (h*31 + code(char)) mod 2^32
--   color = TEAM_COLORS[h mod 10]

create or replace function public.color_for_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  h bigint := 0;
  i int;
  colors text[] := array[
    '#4E8FD6','#7F77DD','#D85A30','#5DCAA5','#D4537E',
    '#B4592E','#6B8E6B','#8A6FD6','#4A9EA1','#C77B3D'
  ];
begin
  for i in 1..length(p_name) loop
    h := (h * 31 + ascii(substr(p_name, i, 1))) % 4294967296;
  end loop;
  return colors[(h % 10) + 1];
end;
$$;

update public.teams set color = public.color_for_name(name);
update public.referees set color = public.color_for_name(name);

drop function public.color_for_name(text);
