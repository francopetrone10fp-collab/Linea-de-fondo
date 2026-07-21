import type { Role, Situation, MaterialType, Evaluation } from "@/lib/database.types";

export const SITUATIONS: Situation[] = [
  "Falta personal",
  "Falta técnica",
  "Falta antideportiva",
  "Violación",
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
  { key: "mala", label: "Mala" },
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
  { key: "otro", label: "Otro", color: "#9299A8", bg: "#2A303C" },
];

export function materialTypeInfo(key: MaterialType) {
  return MATERIAL_TYPES.find((t) => t.key === key) ?? MATERIAL_TYPES[MATERIAL_TYPES.length - 1];
}

export const TEAM_COLORS = [
  "#E8631C", "#2E7DD1", "#1E9E6B", "#C9A227", "#B84E9C",
  "#4E8FD6", "#D65C5C", "#5CA85C", "#8A6FD6", "#D68F3F",
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

export function initials(name: string): string {
  return (
    name
      .trim()
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
  pending: "#5C6270",
};
export { EVAL_COLORS };
