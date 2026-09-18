-- ============================================================
-- Escudo/logo de cada competencia (federación/asociación), igual que ya
-- tienen los árbitros. No existía ninguna política de UPDATE para
-- competitions — hacía falta para poder guardar el photo_url.
-- ============================================================

alter table public.competitions add column if not exists photo_url text;

drop policy if exists competitions_update on public.competitions;
create policy competitions_update on public.competitions
  for update using (public.is_coordinador()) with check (public.is_coordinador());
