-- ============================================================
-- Clubes a los que un árbitro no puede/no quiere dirigir (ej: socio de un
-- club, familiar en el plantel). Es una preferencia estable, no atada a
-- una semana puntual como la disponibilidad — el árbitro la carga una vez
-- y queda hasta que él mismo la cambie. Se usa para bloquear la
-- designación de ese árbitro a ese club (ver setDesignacionArbitro y
-- DesignacionesGrid).
-- ============================================================

create table if not exists public.referee_club_exclusions (
  referee_id uuid not null references public.referees(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (referee_id, team_id)
);

alter table public.referee_club_exclusions enable row level security;

-- El coordinador necesita ver todas las filas para poder bloquear la
-- designación en la grilla; el árbitro solo ve (y gestiona) las propias.
create policy referee_club_exclusions_select on public.referee_club_exclusions
  for select using (public.is_coordinador() or referee_id = public.my_referee_id());

create policy referee_club_exclusions_insert on public.referee_club_exclusions
  for insert with check (referee_id = public.my_referee_id());

create policy referee_club_exclusions_delete on public.referee_club_exclusions
  for delete using (referee_id = public.my_referee_id());
