import type { PartidoFull } from "./queries";

export function refereesText(p: PartidoFull) {
  return p.referees.length ? p.referees.map((r) => r.name).join(" · ") : "Sin árbitros asignados";
}

// Segmento de URL para la carpeta de categoría de un partido (id real, o el
// bucket fijo para los que todavía no tienen una categoría asignada).
export function categorySlugFor(p: PartidoFull) {
  return p.category?.id ?? "sin-categoria";
}
