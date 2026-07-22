-- Agrega "Regla" como tipo de jugada válido para clips.
-- (0001_init.sql ya viene actualizado para instalaciones nuevas; esta
-- migración es para bases que ya corrieron 0001 antes de este cambio.)

alter table public.clips drop constraint if exists clips_situation_check;

alter table public.clips
  add constraint clips_situation_check check (situation in (
    'Falta personal','Falta técnica','Falta antideportiva','Violación','Regla',
    'Mecánica / Posicionamiento','Tiro libre','Gestión de partido','Otro'
  ));
