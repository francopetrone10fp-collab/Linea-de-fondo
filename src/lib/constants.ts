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

// "Competencias" es la puerta de entrada a partidos/clips/evaluaciones — el
// nombre no reflejaba eso, así que el label varía según cómo lo usa cada rol:
// el árbitro navega ahí para ver SUS evaluaciones, el resto para evaluar en
// general.
export const COMPETITIONS_LABEL: Record<Role, string> = {
  arbitro: "Mis evaluaciones",
  instructor: "Evaluaciones",
  coordinador: "Evaluaciones",
};

export function navLabel(item: { label: string | Record<Role, string> }, role: Role): string {
  return typeof item.label === "string" ? item.label : item.label[role];
}

// Accesos del menú, compartidos entre el Sidebar y la pantalla de inicio
// (ambos filtran por rol de la misma lista, para que no se puedan desincronizar).
export const NAV_ITEMS = [
  { view: "inicio", href: "/", label: "Inicio", roles: ["coordinador", "instructor", "arbitro"] },
  { view: "competitions", href: "/competitions", label: COMPETITIONS_LABEL, roles: ["coordinador", "instructor", "arbitro"] },
  { view: "stats", href: "/stats", label: "Estadísticas", roles: ["coordinador", "instructor"] },
  { view: "teams", href: "/teams", label: "Equipos", roles: ["coordinador", "instructor"] },
  { view: "referees", href: "/referees", label: "Árbitros", roles: ["coordinador", "instructor"] },
  { view: "reportes", href: "/reportes", label: "Reportes", roles: ["coordinador", "instructor"] },
  { view: "designaciones", href: "/designaciones", label: "Designaciones", roles: ["coordinador", "instructor", "arbitro"] },
  { view: "disponibilidad", href: "/disponibilidad", label: "Disponibilidad", roles: ["coordinador", "arbitro"] },
  { view: "requests", href: "/requests", label: "Solicitudes", roles: ["coordinador"] },
  { view: "material", href: "/material", label: "Material didáctico", roles: ["coordinador", "instructor", "arbitro"] },
  { view: "clases", href: "/clases", label: "Clases", roles: ["coordinador", "instructor", "arbitro"] },
] as const;

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

// Abreviaturas típicas de nombres de club en las planillas de designaciones
// ("Sp." por "Sportivo", etc.) — se prueban solo si el nombre exacto no
// encontró equipo, y solo se aceptan si el resultado expandido matchea
// exacto contra el directorio (si no, no se fuerza nada).
const TEAM_NAME_ABBREVIATIONS: Record<string, string> = {
  sp: "sportivo",
  pto: "puerto",
  prog: "progreso",
  gral: "general",
  at: "atletico",
};

// Nombres de Designaciones que no se resuelven ni por match exacto ni por
// abreviatura (cambian de nombre entero respecto al directorio de Equipos,
// o el directorio los tiene con una grafía muy distinta) — confirmados a
// mano contra el listado real de designaciones. No se adivina acá: un
// escudo equivocado es peor que ninguno, así que solo entran los casos
// donde no hay otro club candidato que genere ambigüedad.
const TEAM_NAME_ALIASES: Record<string, string> = {
  maciel: "Club Atlético Maciel",
  "alba-de-maciel": "Alba",
  "c-c-y-recreativo-vgg": "Centro Recreativo VGG",
  "nautico-sp": "Náutico Sportivo Avellaneda",
  "nautico-sp-b": 'Náutico Sportivo Avellaneda "B"',
  "r-central": "Rosario Central",
  "r-central-b": 'Rosario Central "B"',
  "regatas-sn": "Regatas San Nicolás",
  "sp-unidos": "Sportsmen Unidos",
  "talleres-as": "Talleres A.S",
  "union-a-seco": "Unión de Arroyo Seco",
  "union-a-s": "Unión de Arroyo Seco",
  // "Gimnasia" / "Gimnasia y Esg(r).": Gimnasia y Esgrima (Rosario) = G.E.R.
  gimnasia: "G.E.R.",
  "gimnasia-y-esg": "G.E.R.",
  "gimnasia-y-esg-b": 'G.E.R. "B"',
  "gimnasia-y-esgr": "G.E.R.",
  "gimnasia-y-esgr-b": 'G.E.R. "B"',
  "newell-s": "NOB",
  "c-a-o-v-a": "Olegario V. Andrade",
  caova: "Olegario V. Andrade",
  paganini: "Paganini Alumni",
  // Alumni, sin más aclaración, siempre es el de Casilda en esta liga —
  // el directorio solo tiene cargado el equipo "B" de ese club.
  "alumni-de-casilda": 'Alumni "B"',
  "alumni-de-casilda-b": 'Alumni "B"',
  "velocidad-y-resistencia": "Velocidad",
  "velocidad-y-resistencia-b": 'Velocidad "B"',
  // Servando Bayo: el directorio solo tiene el logo cargado en el equipo
  // "C", pero es el mismo club/escudo para las demás categorías.
  "servando-bayo": 'Servando Bayo "C"',
  "servando-bayo-b": 'Servando Bayo "C"',
  // Regatas (Rosario) — distinto del Regatas San Nicolás. El directorio
  // solo tiene cargado el logo en el equipo "B" de este club.
  regatas: 'Regatas "B"',
  "temperley-a": "Temperley",
  "sp-unidos-b": "Sportsmen Unidos",
  "l-r-estudiantil": 'L.R. Estudiantil "B"',
  // Atlantic Sp. y Fisherton "A": el directorio solo tiene cargado el logo
  // en el equipo "B" de cada club, que es el mismo escudo.
  "atlantic-sp": 'Atlantic Sp. "B"',
  "fisherton-a": 'Fisherton "B"',
  // "A.D.E.O (CdG)": misma grafía con puntuación que el directorio no tiene.
  "a-d-e-o-cdg": "ADEO",
};

// Designaciones guarda el equipo como texto libre (no como referencia a la
// tabla teams, son módulos independientes), así que para mostrarle el
// escudo hay que buscarlo por nombre normalizado — mismo criterio de
// comparación que ya se usa para roles/apodos (slugKey), más abreviaturas
// y alias conocidos para los casos que el nombre exacto no resuelve.
export function matchTeamByName<T extends { name: string }>(teams: T[], name: string): T | undefined {
  const target = slugKey(name);

  const alias = TEAM_NAME_ALIASES[target];
  if (alias) {
    const aliased = teams.find((t) => slugKey(t.name) === slugKey(alias));
    if (aliased) return aliased;
  }

  const exact = teams.find((t) => slugKey(t.name) === target);
  if (exact) return exact;

  const expandedTarget = slugKey(
    name
      .trim()
      .split(/\s+/)
      .map((word) => TEAM_NAME_ABBREVIATIONS[slugKey(word)] ?? word)
      .join(" ")
  );
  if (expandedTarget !== target) {
    return teams.find((t) => slugKey(t.name) === expandedTarget);
  }
  return undefined;
}

// El comisionado técnico de una designación es texto libre (igual que
// equipo local/visitante), así que casi nunca matchea el nombre completo de
// un árbitro. Por ahora el único caso real es Olga Silvia Zucchio, que
// además de comisionar también dirige — confirmado a mano, no se adivina.
const CT_REFEREE_ALIASES: Record<string, string> = {
  zucchio: "Olga Silvia Zucchio",
};

// Para saber si el monto que cobró un comisionado técnico tiene que sumarse
// al total de algún árbitro (porque esa persona también dirige).
export function matchCtReferee<T extends { name: string }>(referees: T[], ctNombre: string): T | undefined {
  const target = slugKey(ctNombre);
  const alias = CT_REFEREE_ALIASES[target];
  if (alias) {
    const aliased = referees.find((r) => slugKey(r.name) === slugKey(alias));
    if (aliased) return aliased;
  }
  return referees.find((r) => slugKey(r.name) === target);
}

// Teléfono guardado como 10 dígitos locales (código de área + número, sin el
// "9" de WhatsApp ni el "54" de Argentina) — estas dos funciones arman el
// link completo a partir de eso.
export function waLink(telefono: string): string {
  return `https://wa.me/549${telefono.replace(/[^0-9]/g, "")}`;
}

export function telLink(telefono: string): string {
  return `tel:+549${telefono.replace(/[^0-9]/g, "")}`;
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
