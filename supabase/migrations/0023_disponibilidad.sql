-- ============================================================
-- Disponibilidad semanal de los árbitros: cada árbitro carga, semana a
-- semana, si está disponible lunes a viernes (sí/no) y, para sábado y
-- domingo, para qué categorías está disponible (o si no está
-- disponible ese día). El designador usa esto para armar las
-- designaciones del fin de semana. Se guarda una fila por (árbitro,
-- fecha) puntual, así que "se renueva" solo: cada semana tiene sus
-- propias fechas.
-- ============================================================

create table if not exists public.disponibilidades (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.referees(id) on delete cascade,
  fecha date not null,
  disponible boolean not null default true,
  categorias text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (referee_id, fecha)
);

alter table public.disponibilidades enable row level security;

drop policy if exists disponibilidades_select on public.disponibilidades;
create policy disponibilidades_select on public.disponibilidades
  for select using (
    public.is_coordinador() or referee_id = public.my_referee_id()
  );

drop policy if exists disponibilidades_insert on public.disponibilidades;
create policy disponibilidades_insert on public.disponibilidades
  for insert with check (referee_id = public.my_referee_id());

drop policy if exists disponibilidades_update on public.disponibilidades;
create policy disponibilidades_update on public.disponibilidades
  for update using (referee_id = public.my_referee_id())
  with check (referee_id = public.my_referee_id());

drop policy if exists disponibilidades_delete on public.disponibilidades;
create policy disponibilidades_delete on public.disponibilidades
  for delete using (referee_id = public.my_referee_id());
