import type { DesignacionEstado, Rama } from "@/lib/database.types";

export interface RefereeOption {
  id: string;
  name: string;
}

export interface NameResolution {
  raw: string;
  match: RefereeOption | null;
  candidates: RefereeOption[];
}

export interface ParsedImportRow {
  rowNumber: number;
  jornada: string | null;
  fecha: string | null;
  hora: string | null;
  categoria: string;
  equipoLocal: string;
  equipoVisitante: string;
  rama: Rama;
  sede: string | null;
  estado: DesignacionEstado;
  notas: string | null;
  ctNombre: string | null;
  arbitro1: NameResolution | null;
  arbitro2: NameResolution | null;
  arbitro3: NameResolution | null;
  error: string | null;
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function tokensOf(name: string): string[] {
  return normalize(name)
    .split(/\s+/)
    .filter(Boolean);
}

// Matchea un nombre suelto de la planilla ("RODRIGUEZ A", "GASTON") contra la
// lista de árbitros ya cargados: primero por apellido/token exacto, y si hay
// más de un candidato, desambigua con la inicial si vino una.
function resolveReferee(raw: string, referees: RefereeOption[]): NameResolution | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  let surname = trimmed;
  let initial: string | null = null;
  if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
    surname = parts.slice(0, -1).join(" ");
    initial = parts[parts.length - 1];
  }
  const surnameN = normalize(surname);

  let candidates = referees.filter((r) => tokensOf(r.name).includes(surnameN));
  if (candidates.length === 0 && surnameN.length >= 5) {
    candidates = referees.filter((r) => tokensOf(r.name).some((t) => t.startsWith(surnameN)));
  }
  if (candidates.length > 1 && initial) {
    const initN = normalize(initial)[0];
    const narrowed = candidates.filter((r) => tokensOf(r.name).some((t) => t !== surnameN && t.startsWith(initN)));
    if (narrowed.length === 1) candidates = narrowed;
  }

  return { raw: trimmed, match: candidates.length === 1 ? candidates[0] : null, candidates };
}

function parseFecha(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function parseHora(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})[:.hH](\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return null;
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  // fallback: dos o más espacios seguidos como separador de columna
  return line.split(/ {2,}/);
}

export function parsePastedText(text: string, referees: RefereeOption[]): ParsedImportRow[] {
  // Ojo: no usar trim() sobre la línea completa — una jornada vacía (columna
  // A en blanco) deja un tab inicial que hay que conservar para que el resto
  // de las columnas no se corra.
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  return lines.map((line, i) => {
    const cols = splitRow(line).map((c) => c.trim());
    const [jornadaRaw, fechaRaw, horaRaw, categoriaRaw, localRaw, visitanteRaw, a1Raw, a2Raw, colIRaw] = cols;

    const categoria = (categoriaRaw ?? "").trim();
    const equipoLocal = (localRaw ?? "").trim();
    const equipoVisitante = (visitanteRaw ?? "").trim();

    let error: string | null = null;
    if (!categoria || !equipoLocal || !equipoVisitante) {
      error = "Faltan columnas (categoría, local o visitante) — revisá que la fila tenga el formato esperado.";
    }

    let sede: string | null = null;
    let estado: DesignacionEstado = "programado";
    let notas: string | null = null;
    let ctNombre: string | null = null;
    let arbitro3: NameResolution | null = null;

    const colI = (colIRaw ?? "").trim();
    if (colI) {
      const colIN = normalize(colI);
      const match3 = resolveReferee(colI, referees);
      if (match3?.match) {
        arbitro3 = match3;
      } else if (colIN === "SUSPENDIDO") {
        estado = "suspendido";
      } else if (colIN.startsWith("SEDE ")) {
        sede = colI.slice(5).trim();
      } else if (colIN.startsWith("EN ")) {
        sede = colI.slice(3).trim();
      } else if (colIN.startsWith("CON ")) {
        ctNombre = colI.slice(4).trim();
      } else {
        notas = colI;
        if (colIN.includes("A CONFIRMAR")) estado = "confirmar";
      }
    }

    return {
      rowNumber: i + 1,
      jornada: (jornadaRaw ?? "").trim() || null,
      fecha: parseFecha(fechaRaw ?? ""),
      hora: parseHora(horaRaw ?? ""),
      categoria,
      equipoLocal,
      equipoVisitante,
      rama: normalize(categoria).includes("FEM") ? "femenino" : "masculino",
      sede,
      estado,
      notas,
      ctNombre,
      arbitro1: a1Raw ? resolveReferee(a1Raw, referees) : null,
      arbitro2: a2Raw ? resolveReferee(a2Raw, referees) : null,
      arbitro3,
      error,
    };
  });
}
