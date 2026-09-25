-- ============================================================
-- Teléfono de cada árbitro, para que los compañeros designados juntos se
-- puedan contactar (coordinar camiseta, horario, en qué van, etc.) desde
-- Designaciones → Mis designaciones. Mismas policies que ya cubren el
-- resto de la ficha (photo_url, color): referees_select ya es visible
-- para cualquier usuario aprobado, y referees_update ya lo puede tocar
-- coordinador/instructor o el propio árbitro — no hace falta ninguna
-- policy nueva.
-- ============================================================

alter table public.referees add column if not exists telefono text;
