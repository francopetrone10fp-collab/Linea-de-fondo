-- Reestructura "Clases" de una lista plana a una jerarquía Año > Clase, con
-- Nivel (multi-selección: Inicial y/o Medio/Avanzado, cursan juntos) por
-- Clase, más clips propios de cada clase y vínculos a Material didáctico ya
-- cargado.
-- (0001_init.sql ya viene con esta jerarquía final desde el arranque, así
-- que en una instalación nueva este primer paso no hace nada. Solo actúa
-- sobre una base que todavía tiene la tabla "classes" plana de la migración
-- anterior — se deployó hace muy poco y no tiene datos reales cargados.)
do $migrate$
begin
  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'classes'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'classes' and column_name = 'year_id'
  ) then
    execute 'drop table public.classes cascade';
  end if;
end;
$migrate$;

-- Año/ciclo (ej. "2026"): agrupa clases, mismo rol que "seasons" para partidos.
create table if not exists public.class_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists class_years_name_key on public.class_years (lower(name));

-- Clase individual dentro de un año. "levels" es multi-selección porque
-- Nivel Inicial y Nivel Medio/Avanzado suelen cursar la misma clase juntos.
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.class_years(id) on delete cascade,
  title text not null,
  video_url text,
  notes text,
  levels text[] not null default '{}'::text[]
    check (levels <@ array['inicial','medio_avanzado']::text[]),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists classes_year_idx on public.classes (year_id);

-- Clips propios de una clase (video + nota puntual), estructura liviana,
-- sin los campos de evaluación arbitral de los clips de partido.
create table if not exists public.class_clips (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  video_url text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists class_clips_class_idx on public.class_clips (class_id);

-- Vínculo N:N entre una clase y material didáctico ya cargado (no duplica
-- el material, solo lo referencia).
create table if not exists public.class_materials (
  class_id uuid not null references public.classes(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (class_id, material_id)
);

alter table public.class_years enable row level security;
alter table public.classes enable row level security;
alter table public.class_clips enable row level security;
alter table public.class_materials enable row level security;

-- Mismo criterio de permisos en las cuatro tablas: cualquier perfil
-- aprobado puede ver, solo Coordinador General e Instructor (is_evaluator)
-- pueden crear/editar/borrar.

drop policy if exists class_years_select on public.class_years;
create policy class_years_select on public.class_years for select using (public.is_approved());
drop policy if exists class_years_insert on public.class_years;
create policy class_years_insert on public.class_years for insert with check (public.is_evaluator());
drop policy if exists class_years_update on public.class_years;
create policy class_years_update on public.class_years for update using (public.is_evaluator());
drop policy if exists class_years_delete on public.class_years;
create policy class_years_delete on public.class_years for delete using (public.is_evaluator());

drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select using (public.is_approved());
drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert with check (public.is_evaluator());
drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes for update using (public.is_evaluator());
drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes for delete using (public.is_evaluator());

drop policy if exists class_clips_select on public.class_clips;
create policy class_clips_select on public.class_clips for select using (public.is_approved());
drop policy if exists class_clips_insert on public.class_clips;
create policy class_clips_insert on public.class_clips for insert with check (public.is_evaluator());
drop policy if exists class_clips_update on public.class_clips;
create policy class_clips_update on public.class_clips for update using (public.is_evaluator());
drop policy if exists class_clips_delete on public.class_clips;
create policy class_clips_delete on public.class_clips for delete using (public.is_evaluator());

drop policy if exists class_materials_select on public.class_materials;
create policy class_materials_select on public.class_materials for select using (public.is_approved());
drop policy if exists class_materials_insert on public.class_materials;
create policy class_materials_insert on public.class_materials for insert with check (public.is_evaluator());
drop policy if exists class_materials_delete on public.class_materials;
create policy class_materials_delete on public.class_materials for delete using (public.is_evaluator());
