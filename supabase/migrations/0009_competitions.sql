-- Convierte el campo de texto libre "competition" de partidos en un
-- directorio propio (misma lógica que teams/referees), y migra los valores
-- ya cargados (ej. "SUPERLIGA") a filas de ese nuevo directorio para no
-- perder esa información.
-- (0001_init.sql ya viene actualizado para instalaciones nuevas, con la
-- tabla competitions y partidos.competition_id desde el arranque; esta
-- migración es para bases que ya corrieron 0001-0008 con el esquema viejo
-- (columna de texto libre "competition"). Los pasos están protegidos con
-- guards para poder correrla también, sin efecto, sobre una instalación
-- nueva que ya arrancó con el esquema actualizado.)

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  starter boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists competitions_name_key on public.competitions (lower(name));

alter table public.competitions enable row level security;

drop policy if exists competitions_select on public.competitions;
create policy competitions_select on public.competitions
  for select using (public.is_approved());

drop policy if exists competitions_insert on public.competitions;
create policy competitions_insert on public.competitions
  for insert with check (public.is_approved());

drop policy if exists competitions_delete on public.competitions;
create policy competitions_delete on public.competitions
  for delete using (public.is_coordinador());

alter table public.partidos
  add column if not exists competition_id uuid references public.competitions(id) on delete set null;

-- Réplica de colorForTeam() de src/lib/constants.ts (ver 0008 para el detalle).
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

-- El backfill (y el borrado de la columna vieja) solo corre si esta base
-- todavía tiene la columna de texto libre "competition".
do $migrate$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'partidos' and column_name = 'competition'
  ) then
    execute $sql$
      insert into public.competitions (name, color)
      select distinct trim(competition), public.color_for_name(trim(competition))
      from public.partidos
      where competition is not null and trim(competition) <> ''
      on conflict (lower(name)) do nothing
    $sql$;

    execute $sql$
      update public.partidos p
      set competition_id = c.id
      from public.competitions c
      where p.competition is not null
        and trim(p.competition) <> ''
        and lower(c.name) = lower(trim(p.competition))
    $sql$;

    execute 'alter table public.partidos drop column competition';
  end if;
end;
$migrate$;

drop function public.color_for_name(text);
