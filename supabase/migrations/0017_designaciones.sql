-- ============================================================
-- DESIGNACIONES: partidos designados a árbitros, con el monto que
-- cobra cada uno. Es un universo totalmente aparte de los partidos
-- que se cargan para evaluación con video (muchos más partidos,
-- muchos menos datos por partido, y cambia todos los días).
-- ============================================================

-- Aranceles por categoría: además de tarifario, funciona como
-- maestro de categorías para el selector de designaciones.
create table if not exists public.tarifas_categoria (
  categoria text primary key,
  monto_arbitro_1 numeric(10,2) not null default 0,
  monto_arbitro_2 numeric(10,2) not null default 0,
  monto_ct numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.designaciones (
  id uuid primary key default gen_random_uuid(),
  jornada text,
  fecha date,
  hora time,
  categoria text not null,
  competencia text,
  rama text check (rama in ('masculino', 'femenino')),
  equipo_local text not null,
  equipo_visitante text not null,
  sede text,
  estado text not null default 'programado'
    check (estado in ('programado', 'confirmar', 'suspendido', 'jugado')),
  notas text,
  -- El comisionado técnico no pertenece al plantel de árbitros: es un
  -- dato meramente informativo (nombre libre, sin cuenta ni perfil).
  ct_nombre text,
  ct_monto numeric(10,2),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists designaciones_fecha_idx on public.designaciones (fecha);

-- Árbitros asignados a una designación (hasta 3 por partido). El monto
-- queda fijado al momento de designar, tomado de tarifas_categoria pero
-- guardado como valor propio: si después cambia el arancel, no reescribe
-- lo ya designado.
create table if not exists public.designacion_arbitros (
  designacion_id uuid not null references public.designaciones(id) on delete cascade,
  posicion smallint not null check (posicion between 1 and 3),
  referee_id uuid not null references public.referees(id) on delete restrict,
  monto numeric(10,2) not null default 0,
  primary key (designacion_id, posicion)
);
create index if not exists designacion_arbitros_referee_idx on public.designacion_arbitros (referee_id);

alter table public.tarifas_categoria enable row level security;
alter table public.designaciones enable row level security;
alter table public.designacion_arbitros enable row level security;

-- tarifas_categoria: cualquier aprobado puede consultar (para ver a qué
-- corresponde cada categoría), solo coordinador gestiona los aranceles.
drop policy if exists tarifas_categoria_select on public.tarifas_categoria;
create policy tarifas_categoria_select on public.tarifas_categoria
  for select using (public.is_approved());

drop policy if exists tarifas_categoria_insert on public.tarifas_categoria;
create policy tarifas_categoria_insert on public.tarifas_categoria
  for insert with check (public.is_coordinador());

drop policy if exists tarifas_categoria_update on public.tarifas_categoria;
create policy tarifas_categoria_update on public.tarifas_categoria
  for update using (public.is_coordinador()) with check (public.is_coordinador());

drop policy if exists tarifas_categoria_delete on public.tarifas_categoria;
create policy tarifas_categoria_delete on public.tarifas_categoria
  for delete using (public.is_coordinador());

-- designaciones: el fixture en sí es visible para todo aprobado (es
-- información de programación, no de pago); solo coordinador lo edita.
drop policy if exists designaciones_select on public.designaciones;
create policy designaciones_select on public.designaciones
  for select using (public.is_approved());

drop policy if exists designaciones_insert on public.designaciones;
create policy designaciones_insert on public.designaciones
  for insert with check (public.is_coordinador());

drop policy if exists designaciones_update on public.designaciones;
create policy designaciones_update on public.designaciones
  for update using (public.is_coordinador()) with check (public.is_coordinador());

drop policy if exists designaciones_delete on public.designaciones;
create policy designaciones_delete on public.designaciones
  for delete using (public.is_coordinador());

-- designacion_arbitros: acá sí vive el monto, así que un árbitro solo ve
-- sus propias filas (no el pago de sus colegas); coordinador ve todas.
drop policy if exists designacion_arbitros_select on public.designacion_arbitros;
create policy designacion_arbitros_select on public.designacion_arbitros
  for select using (
    public.is_coordinador() or referee_id = public.my_referee_id()
  );

drop policy if exists designacion_arbitros_insert on public.designacion_arbitros;
create policy designacion_arbitros_insert on public.designacion_arbitros
  for insert with check (public.is_coordinador());

drop policy if exists designacion_arbitros_update on public.designacion_arbitros;
create policy designacion_arbitros_update on public.designacion_arbitros
  for update using (public.is_coordinador()) with check (public.is_coordinador());

drop policy if exists designacion_arbitros_delete on public.designacion_arbitros;
create policy designacion_arbitros_delete on public.designacion_arbitros
  for delete using (public.is_coordinador());
