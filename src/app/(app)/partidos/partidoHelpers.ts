import type { PartidoFull } from "./queries";

export function refereesText(p: PartidoFull) {
  return p.referees.length ? p.referees.map((r) => r.name).join(" · ") : "Sin árbitros asignados";
}

// Segmento de URL para la carpeta de competencia de un partido (id real, o
// el bucket fijo para los que todavía no tienen una competencia asignada).
// La competencia es el nivel de navegación de Partidos; la categoría es
// solo una etiqueta y no agrupa carpetas.
export function competitionSlugFor(p: PartidoFull) {
  return p.competition?.id ?? "sin-competencia";
}
