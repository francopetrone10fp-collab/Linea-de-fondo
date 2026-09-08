-- Línea de Fondo — esquema inicial + RLS
-- Roles: coordinador | instructor | arbitro
-- Ver /docs/MIGRATION.md (o el README) para el resumen de reglas de negocio.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (vinculado a auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('coordinador','instructor','arbitro')),
  status text not null default 'pending' check (status in ('approved','pending')),
  photo_url text,
  referee_id uuid, -- fk agregada más abajo, luego de crear referees
  created_at timestamptz not null default now()
);

create unique index profiles_name_key on public.profiles (lower(name));

-- ============================================================
-- 2. REFEREES / TEAMS (directorios compartidos)
-- ============================================================
create table public.referees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  photo_url text,
  starter boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index referees_name_key on public.referees (lower(name));

alter table public.profiles
  add constraint profiles_referee_id_fkey foreign key (referee_id) references public.referees(id) on delete set null;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  starter boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index teams_name_key on public.teams (lower(name));

-- Categorías (ej. Superliga, U19): división/nivel de competencia dentro de
-- una asociación. No confundir con "competitions" (más abajo), que son las
-- asociaciones/federaciones organizadoras (AROB, CAB, FBPSF).
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  starter boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Competencias: asociaciones/federaciones organizadoras (ej. AROB, CAB,
-- FBPSF). Independiente de la categoría del partido.
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  starter boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index competitions_name_key on public.competitions (lower(name));

-- Las categorías disponibles dependen de la competencia (cada asociación
-- define sus propias divisiones, incluso con nombres repetidos entre sí:
-- "Juveniles" de AROB no es la misma categoría que "Juveniles" de FBPSF),
-- por eso el índice único es por (competencia, nombre) y no solo por nombre.
alter table public.categories
  add column competition_id uuid references public.competitions(id) on delete set null;
create unique index categories_name_key on public.categories (competition_id, lower(name));

-- Temporadas de una competencia (ej. "2026"): entidad propia, no solo un
-- valor derivado del año de los partidos, para poder crearla vacía desde la
-- vista de Competencia y que no desaparezca si se borran todos sus partidos.
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index seasons_competition_name_key on public.seasons (competition_id, lower(name));

-- ============================================================
-- 3. PARTIDOS
-- ============================================================
create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  fecha date,
  temporada text generated always as (
    case when fecha is null then 'Sin fecha' else extract(year from fecha)::text end
  ) stored,
  team_local_id uuid references public.teams(id) on delete set null,
  team_visit_id uuid references public.teams(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  competition_id uuid references public.competitions(id) on delete set null,
  season_id uuid references public.seasons(id) on delete set null,
  notes text,
  finalized_by uuid references public.profiles(id) on delete set null,
  finalized_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- mecánica de 2 o 3 árbitros por partido
create table public.partido_referees (
  partido_id uuid not null references public.partidos(id) on delete cascade,
  referee_id uuid not null references public.referees(id) on delete restrict,
  position smallint not null check (position between 1 and 3),
  primary key (partido_id, position)
);
create index partido_referees_referee_idx on public.partido_referees (referee_id);

-- ============================================================
-- 4. CLIPS
-- ============================================================
create table public.clips (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  title text not null,
  video_url text,
  situation text not null check (situation in (
    'Falta personal','Falta técnica','Falta antideportiva','Violación','Regla',
    'Mecánica / Posicionamiento','Tiro libre','Gestión de partido','Otro'
  )),
  quarter text not null default 'Q1',
  clock text,
  referee_id uuid references public.referees(id) on delete set null,
  notes text,
  evaluation text check (evaluation in ('mala','estandar','buena','relevante')),
  whistle_type text check (whistle_type in ('QW','IW','PW','CW','NCC','NCI')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index clips_partido_idx on public.clips (partido_id);
create index clips_referee_idx on public.clips (referee_id);

-- ============================================================
-- 5. MATERIALES
-- ============================================================
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('pdf','word','video','presentacion','enlace','otro')),
  url text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5b. CLASES (video + notas, la arma Coordinador/Instructor, la ve todo el equipo)
-- ============================================================
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. COMENTARIOS (partido o clip)
-- ============================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('partido','clip')),
  entity_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_role text not null check (author_role in ('coordinador','instructor','arbitro')),
  text text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index comments_entity_idx on public.comments (entity_type, entity_id);

-- ============================================================
-- Funciones auxiliares para RLS (SECURITY DEFINER, search_path fijo)
-- ============================================================
create or replace function public.current_role_is(roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved' and role = any(roles)
  );
$$;

create or replace function public.is_coordinador()
returns boolean language sql security definer set search_path = public stable
as $$ select public.current_role_is(array['coordinador']); $$;

create or replace function public.is_evaluator()
returns boolean language sql security definer set search_path = public stable
as $$ select public.current_role_is(array['coordinador','instructor']); $$;

create or replace function public.is_approved()
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.my_referee_id()
returns uuid language sql security definer set search_path = public stable
as $$
  select referee_id from public.profiles where id = auth.uid();
$$;

-- ¿El usuario actual (como árbitro) puede ver este partido?
-- (asignado a la terna Y ya finalizado)
create or replace function public.partido_visible_to_arbitro(p_partido_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1
    from public.partidos p
    join public.partido_referees pr on pr.partido_id = p.id
    where p.id = p_partido_id
      and p.finalized_at is not null
      and pr.referee_id = public.my_referee_id()
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.referees enable row level security;
alter table public.teams enable row level security;
alter table public.categories enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.partidos enable row level security;
alter table public.partido_referees enable row level security;
alter table public.clips enable row level security;
alter table public.materials enable row level security;
alter table public.classes enable row level security;
alter table public.comments enable row level security;

-- ---------- profiles ----------
-- lectura: uno mismo; coordinador ve todo (incluye pendientes, para aprobar);
-- cualquier usuario aprobado puede ver nombre/rol de otros perfiles aprobados
-- (se necesita para mostrar "finalizado por X", "subido por Y", etc.)
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_coordinador()
    or (status = 'approved' and public.is_approved())
  );

-- las filas se crean vía server action con service_role (bypassa RLS),
-- así que no exponemos INSERT a usuarios autenticados directamente.

-- update: uno mismo (ej. su foto) o coordinador (aprobar / cambiar rol y estado).
-- Qué columnas puede tocar cada quién se resuelve con el trigger de más abajo,
-- porque RLS (USING/WITH CHECK) no distingue columnas, solo filas.
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_coordinador())
  with check (id = auth.uid() or public.is_coordinador());

-- un usuario no-coordinador no puede tocar su propio role/status/referee_id
-- (auth.uid() is null = contexto de service_role del servidor, confiable)
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_coordinador() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.referee_id is distinct from old.referee_id then
      raise exception 'No autorizado para modificar rol/estado/árbitro vinculado';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();

-- rechazo de solicitud pendiente = borrar el perfil (solo coordinador)
create policy profiles_delete on public.profiles
  for delete using (public.is_coordinador());

-- ---------- referees ----------
create policy referees_select on public.referees
  for select using (public.is_approved());

create policy referees_insert on public.referees
  for insert with check (public.is_approved());

-- editar foto: coordinador/instructor, o el propio árbitro sobre su ficha
create policy referees_update on public.referees
  for update using (
    public.is_evaluator() or id = public.my_referee_id()
  );

create policy referees_delete on public.referees
  for delete using (public.is_coordinador());

-- ---------- teams ----------
create policy teams_select on public.teams
  for select using (public.is_approved());

create policy teams_insert on public.teams
  for insert with check (public.is_approved());

create policy teams_delete on public.teams
  for delete using (public.is_coordinador());

-- ---------- categories ----------
create policy categories_select on public.categories
  for select using (public.is_approved());

create policy categories_insert on public.categories
  for insert with check (public.is_approved());

create policy categories_delete on public.categories
  for delete using (public.is_coordinador());

-- ---------- competitions ----------
create policy competitions_select on public.competitions
  for select using (public.is_approved());

create policy competitions_insert on public.competitions
  for insert with check (public.is_approved());

create policy competitions_delete on public.competitions
  for delete using (public.is_coordinador());

-- ---------- seasons ----------
create policy seasons_select on public.seasons
  for select using (public.is_approved());

create policy seasons_insert on public.seasons
  for insert with check (public.is_approved());

-- ---------- partidos ----------
create policy partidos_select on public.partidos
  for select using (
    public.is_evaluator() or public.partido_visible_to_arbitro(id)
  );

create policy partidos_insert on public.partidos
  for insert with check (public.is_evaluator());

create policy partidos_update on public.partidos
  for update using (public.is_evaluator());

create policy partidos_delete on public.partidos
  for delete using (public.is_evaluator());

-- ---------- partido_referees ----------
create policy partido_referees_select on public.partido_referees
  for select using (
    public.is_evaluator() or public.partido_visible_to_arbitro(partido_id)
  );

create policy partido_referees_insert on public.partido_referees
  for insert with check (public.is_evaluator());

create policy partido_referees_update on public.partido_referees
  for update using (public.is_evaluator());

create policy partido_referees_delete on public.partido_referees
  for delete using (public.is_evaluator());

-- ---------- clips ----------
create policy clips_select on public.clips
  for select using (
    public.is_evaluator() or public.partido_visible_to_arbitro(partido_id)
  );

create policy clips_insert on public.clips
  for insert with check (
    public.is_evaluator()
    and exists (select 1 from public.partidos p where p.id = partido_id and p.finalized_at is null)
  );

create policy clips_update on public.clips
  for update using (
    public.is_evaluator()
    and exists (select 1 from public.partidos p where p.id = partido_id and p.finalized_at is null)
  );

create policy clips_delete on public.clips
  for delete using (public.is_coordinador());

-- ---------- materials ----------
create policy materials_select on public.materials
  for select using (public.is_approved());

create policy materials_insert on public.materials
  for insert with check (public.is_evaluator());

create policy materials_update on public.materials
  for update using (public.is_evaluator());

create policy materials_delete on public.materials
  for delete using (public.is_evaluator());

-- ---------- classes ----------
create policy classes_select on public.classes
  for select using (public.is_approved());

create policy classes_insert on public.classes
  for insert with check (public.is_evaluator());

create policy classes_update on public.classes
  for update using (public.is_evaluator());

create policy classes_delete on public.classes
  for delete using (public.is_evaluator());

-- ---------- comments ----------
-- visibilidad: si es de un partido, igual que partidos_select; si es de un clip, igual que clips_select
create policy comments_select on public.comments
  for select using (
    public.is_evaluator()
    or (entity_type = 'partido' and public.partido_visible_to_arbitro(entity_id))
    or (entity_type = 'clip' and exists (
      select 1 from public.clips c where c.id = entity_id and public.partido_visible_to_arbitro(c.partido_id)
    ))
  );

create policy comments_insert on public.comments
  for insert with check (
    author_id = auth.uid()
    and (
      public.is_evaluator()
      or (entity_type = 'partido' and public.partido_visible_to_arbitro(entity_id))
      or (entity_type = 'clip' and exists (
        select 1 from public.clips c where c.id = entity_id and public.partido_visible_to_arbitro(c.partido_id)
      ))
    )
  );

-- editar/eliminar comentarios: solo coordinador/instructor (no el autor original)
create policy comments_update on public.comments
  for update using (public.is_evaluator());

create policy comments_delete on public.comments
  for delete using (public.is_evaluator());

-- ============================================================
-- Storage: bucket de avatars (fotos de perfil/árbitros)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_authenticated_write on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy avatars_authenticated_update on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
