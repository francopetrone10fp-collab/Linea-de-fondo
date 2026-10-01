-- Feed de notificaciones consolidado en Inicio (confirmaciones de
-- designaciones + comentarios de árbitros en partidos/clips), visible para
-- coordinador/instructor. Reemplaza a la campanita que antes vivía solo
-- adentro de Designaciones (designaciones_bell_seen_at queda en desuso, no
-- se borra por las dudas que algo todavía la lea).
alter table public.profiles add column if not exists notificaciones_home_seen_at timestamptz;
