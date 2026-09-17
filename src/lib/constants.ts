import type { Role, Situation, MaterialType, Evaluation, WhistleType, ClassLevel } from "@/lib/database.types";
import { isWeekend } from "@/lib/weekUtils";

export const SITUATIONS: Situation[] = [
  "Falta personal",
  "Falta técnica",
  "Falta antideportiva",
  "Violación",
  "Regla",
  "Mecánica / Posicionamiento",
  "Tiro libre",
  "Gestión de partido",
  "Otro",
];

export const ROLE_LABELS: Record<Role, string> = {
  coordinador: "Coordinador General",
  instructor: "Instructor",
  arbitro: "Árbitro",
};

export const EVAL_LEVELS: { key: Evaluation; label: string }[] = [
  { key: "mala", label: "No recomendable" },
  { key: "estandar", label: "Estándar" },
  { key: "buena", label: "Buena" },
  { key: "relevante", label: "Relevante" },
];

export function evalLabel(key: Evaluation | null | undefined) {
  return EVAL_LEVELS.find((e) => e.key === key)?.label ?? key ?? "";
}

export const MATERIAL_TYPES: { key: MaterialType; label: string; color: string; bg: string }[] = [
  { key: "pdf", label: "PDF", color: "#D64545", bg: "#331B1B" },
  { key: "word", label: "Word", color: "#4E8FD6", bg: "#182535" },
  { key: "video", label: "Video", color: "#E8342A", bg: "#331B1B" },
  { key: "presentacion", label: "Presentación", color: "#D6A73F", bg: "#332B15" },
  { key: "enlace", label: "Enlace / Web", color: "#16A184", bg: "#0F2E28" },
  { key: "otro", label: "Otro", color: "#97A1AE", bg: "#232B37" },
];

export function materialTypeInfo(key: MaterialType) {
  return MATERIAL_TYPES.find((t) => t.key === key) ?? MATERIAL_TYPES[MATERIAL_TYPES.length - 1];
}

// Tipo de silbato: da seguimiento a la impulsividad y velocidad de
// procesamiento de cada árbitro al tomar una decisión. Campo opcional a
// nivel clip (no todas las jugadas se prestan a clasificarlo).
export const WHISTLE_TYPES: { key: WhistleType; label: string; fullName: string; color: string; bg: string }[] = [
  { key: "QW", label: "QW", fullName: "Quick Whistle", color: "#E8631C", bg: "#3A2414" },
  { key: "IW", label: "IW", fullName: "Immediate Whistle", color: "#D6A73F", bg: "#332B15" },
  { key: "PW", label: "PW", fullName: "Patient Whistle", color: "#16A184", bg: "#0F2E28" },
  { key: "CW", label: "CW", fullName: "Cadent Whistle", color: "#4E8FD6", bg: "#182535" },
  { key: "NCC", label: "No Call ✓", fullName: "No Call correcto", color: "#3FA34D", bg: "#1B2E1F" },
  { key: "NCI", label: "No Call ✗", fullName: "No Call incorrecto", color: "#D64545", bg: "#331B1B" },
];

export function whistleTypeInfo(key: WhistleType | null | undefined) {
  return WHISTLE_TYPES.find((t) => t.key === key) ?? null;
}

// Nivel de una clase: multi-selección, porque Inicial y Medio/Avanzado
// suelen cursar la misma clase juntos.
export const CLASS_LEVELS: { key: ClassLevel; label: string; color: string; bg: string }[] = [
  { key: "inicial", label: "Nivel Inicial", color: "#4E8FD6", bg: "#182535" },
  { key: "medio_avanzado", label: "Nivel Medio/Avanzado", color: "#8A6FD6", bg: "#241C40" },
];

export function classLevelInfo(key: ClassLevel) {
  return CLASS_LEVELS.find((l) => l.key === key) ?? CLASS_LEVELS[0];
}

// Categorías de disponibilidad de fin de semana: mismas opciones que el
// formulario de Google que se usaba antes, para no romper el criterio que
// ya conocen los árbitros.
export const CATEGORIAS_DISPONIBILIDAD = [
  "U9 Y U11",
  "INTANFIL (U13)",
  "CADETE (U15)",
  "JUVENIL (U17)",
  "LIGA PROXIMO (U21)",
  "TIRA ENTERA",
  "PRIMERA DIVISIÓN",
  "FULL TIME",
];

// PRIMERA DIVISIÓN solo se juega los domingos, así que es la única categoría
// que no se ofrece como opción el sábado.
export const CATEGORIAS_DISPONIBILIDAD_SABADO = CATEGORIAS_DISPONIBILIDAD.filter((c) => c !== "PRIMERA DIVISIÓN");

// Mapea la categoría real de un partido (texto libre, ej. "SUB 15 - Cadete
// C") al casillero de disponibilidad que le corresponde. Es una heurística
// por palabras clave — si no reconoce la categoría devuelve null, y en ese
// caso el bloqueo por disponibilidad no aplica (mejor no bloquear una
// designación válida que bloquear de más por una categoría rara).
export function categoriaToDisponibilidadBucket(categoria: string): string | null {
  const c = categoria.toUpperCase();
  if (c.includes("SUB 9") || c.includes("SUB 11") || c.includes("MINI")) return "U9 Y U11";
  if (c.includes("SUB 13") || c.includes("INFANTIL")) return "INTANFIL (U13)";
  if (c.includes("SUB 15") || c.includes("CADETE")) return "CADETE (U15)";
  if (c.includes("SUB 17") || c.includes("JUVENIL")) return "JUVENIL (U17)";
  if (c.includes("SUB 21") || c.includes("LIGA PROXIMO") || c.includes("LIGA PRÓXIMO")) return "LIGA PROXIMO (U21)";
  if (c.includes("PRIMERA")) return "PRIMERA DIVISIÓN";
  return null;
}

// Motivo de bloqueo (o null si puede designarse) al querer poner a este
// árbitro en un partido de esa fecha y categoría, según lo que cargó en
// Disponibilidad. Entre semana solo importa el sí/no; el fin de semana
// también importa la categoría marcada (salvo que haya puesto FULL TIME o
// TIRA ENTERA, que cubren cualquier categoría). Si no cargó nada para esa
// fecha, no se bloquea — "sin responder" no es lo mismo que "no disponible".
export function disponibilidadBlockReason(
  disponibilidad: { disponible: boolean; categorias: string[] } | null | undefined,
  fecha: string,
  categoria: string
): string | null {
  if (!disponibilidad) return null;

  if (!isWeekend(fecha)) {
    return disponibilidad.disponible ? null : "Marcó que no está disponible ese día.";
  }

  if (!disponibilidad.disponible || disponibilidad.categorias.length === 0) {
    return "Marcó que no está disponible ese día.";
  }
  if (disponibilidad.categorias.includes("FULL TIME") || disponibilidad.categorias.includes("TIRA ENTERA")) return null;

  const bucket = categoriaToDisponibilidadBucket(categoria);
  if (!bucket || disponibilidad.categorias.includes(bucket)) return null;

  return `Solo marcó disponibilidad para: ${disponibilidad.categorias.join(", ")}.`;
}

export const DIAS_SEMANA = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;

export const TEAM_COLORS = [
  "#4E8FD6", "#7F77DD", "#D85A30", "#5DCAA5", "#D4537E",
  "#B4592E", "#6B8E6B", "#8A6FD6", "#4A9EA1", "#C77B3D",
];

// Directorio de árbitros "de arranque": se usa únicamente para decidir el rol
// sugerido al crear una cuenta (ver allowedRoleForName), igual que en el
// prototipo original. El directorio real y editable vive en la tabla `referees`.
export const DEFAULT_REFEREES = [
  "Benjamín Salvia", "Rocío Cosenza", "Rodrigo Fontana", "Mateo Tornambe", "Marx Orian Silva",
  "Matías Ojeda", "Cristian Tornambe", "Bianchini Marcelo", "Anabela Peralta", "Benjamin Carranza",
  "Noelia Belén Leguizamon", "Walter Paolini", "Franco Natanael Arce", "Sergio Sottini",
  "Jorge Silvio Paolini", "Tobias Leandro Pérez", "Jeronimo Gonzalez", "Lisandro Rodriguez",
  "Joaquín Ojeda", "Mauricio Minerva", "Milton Pecile", "Gonzalo Enrici", "Geremias Crispin",
  "Diego Martone", "Gustavo Taiguan", "Diego Bissolatti", "Baez Ignacio", "Daniel Paolini",
  "Genaro Robiglio", "Ignacio Jacen Ismail", "Aylen Gallego", "Matias Blanco", "Arturo Velásquez",
  "Joaquín Fernández Ortega", "Melisa Dobler", "Federico Jasinski", "Castellanos Boglich Mateo",
  "Máximo Valentín González", "Gastón Basile", "Ignacio Nuñez", "Walter Valente", "Carlos Ocaranza",
  "Tomas Salvia", "Santino Iusto", "Ignacio Nieto", "Paulo Godoy", "Carasa Valentin", "Luis Salcedo",
  "Micaela Carballo", "Agustin Felip", "Juan Pablo Rivera", "Francisco Gielis", "Pelotti Franco",
  "Alejandra Yanina Fernandez", "Olga Silvia Zucchio", "Gutiérrez Jeremias David", "Guarnieri Joel",
  "Facundo Trivero", "Esteban D. Badia", "Joel Cisneros", "Mateo Sanchez", "Maximo Salinas",
  "Walter Adrián Paolini", "Lautaro Trasante", "Ivan Benitez", "Catalina Gonzalez", "Amilkar Rodriguez",
  "Kevin Bergonzoni", "Petrone Franco", "Leonel Lescoul",
];

// Reglas de asignación de rol al crear cuenta (lógica de negocio a preservar).
const SPECIAL_ROLES: Record<string, Role> = {
  "guido-fama": "instructor",
  "juan-jerez": "instructor",
  "franco-petrone": "coordinador",
};

export function slugKey(s: string | null | undefined): string {
  return (
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sin-nombre"
  );
}

// Devuelve el rol asignado automáticamente para un nombre nuevo, o null si
// el usuario tiene que elegir uno y quedar pendiente de aprobación.
export function allowedRoleForName(name: string): Role | null {
  const slug = slugKey(name);
  if (SPECIAL_ROLES[slug]) return SPECIAL_ROLES[slug];
  if (DEFAULT_REFEREES.some((r) => slugKey(r) === slug)) return "arbitro";
  return null;
}

export function colorForTeam(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TEAM_COLORS[h % TEAM_COLORS.length];
}

export function normName(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

// Si el nombre termina en un acrónimo entre paréntesis (ej. "Asociación
// Rosarina de Básquet (AROB)"), usamos ese acrónimo como iniciales en vez de
// las primeras letras de las primeras palabras — es el identificador por el
// que se reconoce a la competencia.
export function initials(name: string): string {
  const trimmed = name.trim();
  const acronym = trimmed.match(/\(([A-Za-z0-9]{2,8})\)\s*$/);
  if (acronym) return acronym[1].toUpperCase();
  return (
    trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

export function truncateText(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

const EVAL_COLORS: Record<string, string> = {
  mala: "#D64545",
  estandar: "#D6A73F",
  buena: "#3FA34D",
  relevante: "#16A184",
  pending: "#5C6672",
};
export { EVAL_COLORS };
