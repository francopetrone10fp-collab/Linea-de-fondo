-- ============================================================
-- Escudo de cada equipo, igual que ya tienen árbitros y competencias. No
-- existía ninguna política de UPDATE para teams — hacía falta para poder
-- guardar el photo_url.
-- ============================================================

alter table public.teams add column if not exists photo_url text;

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update using (public.is_evaluator()) with check (public.is_evaluator());
