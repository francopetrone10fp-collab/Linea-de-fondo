-- "Clases": biblioteca de clases/capacitaciones (video + notas) para todo el
-- equipo. La arma y edita Coordinador General o Instructor; la puede ver
-- cualquier perfil aprobado (incluido Árbitro), igual que Material didáctico.
-- (0001_init.sql ya viene con esta tabla desde el arranque.)

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;

drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select using (public.is_approved());

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes
  for insert with check (public.is_evaluator());

drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes
  for update using (public.is_evaluator());

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes
  for delete using (public.is_evaluator());
