-- Campanita de notificaciones de "Fulano confirmó su partido" en la grilla
-- de Designaciones (solo coordinador/instructor). El feed en sí se arma a
-- partir de designacion_confirmaciones (ya visible para is_coordinador() por
-- RLS existente); esta columna solo guarda cuándo cada coordinador/instructor
-- abrió la campana por última vez, para saber qué marcar como "nuevo".
-- Ya está cubierta por la policy profiles_update existente (uno mismo puede
-- actualizar su propia fila).
alter table public.profiles add column if not exists designaciones_bell_seen_at timestamptz;
