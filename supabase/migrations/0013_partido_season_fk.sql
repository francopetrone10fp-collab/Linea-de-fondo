-- La temporada de un partido pasa de ser un valor derivado del año de su
-- fecha (columna generada, sin ninguna relación real) a una FK propia hacia
-- "seasons" (0012). Así un partido queda relacionado con su temporada de
-- verdad, en vez de "flotar" atado únicamente a su fecha: crear la
-- temporada, borrar todos sus partidos, editar la fecha de un partido, etc.
-- ya no hacen que la temporada aparezca/desaparezca por arte de magia.
-- (0001_init.sql ya viene con esta columna desde el arranque.)

alter table public.partidos
  add column if not exists season_id uuid references public.seasons(id) on delete set null;

-- Backfill: todo partido con competencia asignada se vincula a la fila de
-- "seasons" que ya le corresponde por (competencia, temporada) — esa fila
-- ya existe gracias al backfill de 0012. Los partidos sin competencia
-- ("Sin competencia") quedan sin season_id y se siguen agrupando por el
-- valor derivado de su fecha, igual que antes.
update public.partidos p
set season_id = s.id
from public.seasons s
where p.season_id is null
  and p.competition_id is not null
  and s.competition_id = p.competition_id
  and lower(s.name) = lower(p.temporada);
