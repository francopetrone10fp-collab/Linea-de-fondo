-- Agrega el campo opcional whistle_type a clips: da seguimiento a la
-- impulsividad y velocidad de procesamiento de cada árbitro en sus
-- decisiones. Valores: QW (Quick Whistle), IW (Immediate Whistle),
-- PW (Patient Whistle), CW (Cadent Whistle).
-- (0001_init.sql ya viene actualizado para instalaciones nuevas; esta
-- migración es para bases que ya corrieron 0001 antes de este cambio.)

alter table public.clips
  add column if not exists whistle_type text check (whistle_type in ('QW','IW','PW','CW'));
