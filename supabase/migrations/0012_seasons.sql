-- Hasta ahora la "temporada" de un partido era un valor derivado (el año de
-- su fecha), sin ninguna fila propia en la base: si se borraban todos los
-- partidos de una temporada, la temporada dejaba de existir en cualquier
-- sentido y desaparecía del listado de la Competencia sin dejar rastro.
-- Esta migración la convierte en una entidad propia por competencia, para
-- poder crearla vacía desde la vista de Competencia y que no desaparezca.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists seasons_competition_name_key on public.seasons (competition_id, lower(name));

alter table public.seasons enable row level security;

drop policy if exists seasons_select on public.seasons;
create policy seasons_select on public.seasons
  for select using (public.is_approved());

drop policy if exists seasons_insert on public.seasons;
create policy seasons_insert on public.seasons
  for insert with check (public.is_approved());

-- Backfill: toda combinación (competencia, temporada) que ya tiene partidos
-- cargados pasa a tener también su fila propia en "seasons", para que de acá
-- en más no vuelva a desaparecer si se borran todos sus partidos.
insert into public.seasons (competition_id, name)
select distinct competition_id, temporada
from public.partidos
where competition_id is not null
on conflict (competition_id, lower(name)) do nothing;
