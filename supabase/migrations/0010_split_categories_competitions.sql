-- Lo que la migración 0009 llamó "competitions" (con "Superliga" cargado)
-- en realidad es la CATEGORÍA del partido (división/nivel), no la
-- competencia/asociación organizadora. Esta migración:
--   1. Renombra esa tabla/columna a "categories" / "partidos.category_id",
--      sin perder los vínculos ya cargados (rename, no recreate).
--   2. Crea una tabla "competitions" NUEVA de verdad (asociaciones/
--      federaciones: AROB, CAB, FBPSF) con su propia columna en partidos.
-- (0001_init.sql ya viene actualizado para instalaciones nuevas con este
-- esquema final desde el arranque; los pasos de rename están protegidos
-- para no hacer nada si esta base ya arrancó con los nombres nuevos.)

-- Paso 1: renombrar la tabla vieja "competitions" (la de 0009) a
-- "categories", solo si todavía no se hizo.
do $rename_table$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'competitions')
     and not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'categories')
  then
    alter table public.competitions rename to categories;
    alter index public.competitions_name_key rename to categories_name_key;
    alter policy competitions_select on public.categories rename to categories_select;
    alter policy competitions_insert on public.categories rename to categories_insert;
    alter policy competitions_delete on public.categories rename to categories_delete;
  end if;
end;
$rename_table$;

-- Paso 2: renombrar partidos.competition_id (viejo) a category_id, solo si
-- todavía no se hizo.
do $rename_column$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'partidos' and column_name = 'competition_id'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'partidos' and column_name = 'category_id'
  )
  then
    alter table public.partidos rename column competition_id to category_id;
    alter table public.partidos rename constraint partidos_competition_id_fkey to partidos_category_id_fkey;
  end if;
end;
$rename_column$;

-- Paso 3: tabla nueva "competitions" (asociaciones/federaciones), separada
-- de "categories".
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

insert into public.competitions (name, color) values
  ('Asociación Rosarina de Básquet (AROB)', '#8A6FD6'),
  ('Confederación Argentina de Básquet (CAB)', '#4A9EA1'),
  ('Federación de Básquet de la Provincia de Santa Fe (FBPSF)', '#D4537E')
on conflict (lower(name)) do nothing;
