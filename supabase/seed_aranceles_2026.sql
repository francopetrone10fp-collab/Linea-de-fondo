-- Aranceles reales (fuente: PDFs "ARANCELES A COOPERATIVAS 2026" y
-- "ARANCELES FEDERATIVOS SANTA FE 2026", vigentes desde 23/07/2026).
-- No es una migración de esquema: son datos de referencia, se puede
-- volver a correr sin problema (upsert por competencia + categoría).
--
-- Nota: los nombres de categoría acá son los del PDF. Cuando migremos el
-- CSV real de la planilla, puede que haga falta ajustar/agregar variantes
-- (ej. "PRIMERA FEM A" vs "PRIMERA A y B - FEMENINA") para que el
-- buscador de la designación encuentre la tarifa correcta.

insert into public.tarifas_categoria (competencia, categoria, modo, monto_arbitro, monto_ct) values
  ('LFF', 'SUPER LIGA - MASCULINO', 'por_arbitro', 72000, 0),
  ('LFF', 'PRIMERA A - MASCULINO', 'por_arbitro', 63000, 0),
  ('LFF', 'PRIMERA B - MASCULINO', 'por_arbitro', 52000, 0),
  ('LFF', 'PRIMERA A y B - FEMENINA', 'por_arbitro', 52000, 0),
  ('LFF', 'PRIMERA C y D - MASCULINO', 'por_arbitro', 45000, 0),
  -- Pre-mini/Mini: un solo arancel de $17.500 por partido, repartido
  -- entre los árbitros que asistieron (1 o 2).
  ('LFF', 'U9', 'total_partido', 17500, 0),
  ('LFF', 'U11', 'total_partido', 17500, 0),
  ('LFF', 'U13', 'por_arbitro', 19000, 0),
  ('LFF', 'U15', 'por_arbitro', 21500, 0),
  ('LFF', 'U17', 'por_arbitro', 24500, 0),
  ('LFF', 'U21', 'por_arbitro', 31500, 0),
  ('Federativos', 'SUB 11 - MINI B', 'por_arbitro', 20500, 0),
  ('Federativos', 'SUB 13 - Infantiles', 'por_arbitro', 25000, 0),
  ('Federativos', 'SUB 15 - Cadetes', 'por_arbitro', 29500, 0),
  ('Federativos', 'SUB 17 - Juveniles', 'por_arbitro', 34000, 0),
  ('Federativos', 'SUB 21 - Liga Proximo', 'por_arbitro', 38500, 0)
on conflict (competencia, categoria) do update set
  modo = excluded.modo,
  monto_arbitro = excluded.monto_arbitro;

-- Viáticos (Federativos), informativos, se cobran en cancha.
insert into public.viaticos_localidad (localidad, monto) values
  ('Villa Gobernador Gálvez', 12000),
  ('Funes', 12600),
  ('Granadero Baigorria', 12600),
  ('Oliveros', 35500),
  ('Casilda', 35000),
  ('Maciel', 45000)
on conflict (localidad) do update set monto = excluded.monto;
