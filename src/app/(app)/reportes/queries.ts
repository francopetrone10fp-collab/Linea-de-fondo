import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Situation, Evaluation, WhistleType } from "@/lib/database.types";
import type { DirectoryEntry } from "@/app/(app)/partidos/queries";

type DB = SupabaseClient<Database>;

export interface ReportClipRow {
  id: string;
  partidoId: string;
  partidoTemporada: string;
  fecha: string | null;
  teamLocal: DirectoryEntry | null;
  teamVisit: DirectoryEntry | null;
  referee: DirectoryEntry | null;
  title: string;
  situation: Situation;
  quarter: string;
  clock: string | null;
  evaluation: Evaluation | null;
  whistleType: WhistleType | null;
}

// Todas las jugadas de la app (sin acotar a un partido), con los datos de su
// partido/equipos/árbitro ya resueltos, para poder filtrarlas y agregarlas en
// la sección de Reportes.
export async function fetchAllClipsFull(supabase: DB): Promise<ReportClipRow[]> {
  const [{ data: clips }, { data: partidos }, { data: teams }, { data: referees }] = await Promise.all([
    supabase.from("clips").select("*"),
    supabase.from("partidos").select("id, fecha, temporada, team_local_id, team_visit_id"),
    supabase.from("teams").select("id, name, color"),
    supabase.from("referees").select("id, name, color, photo_url"),
  ]);

  const partidoById = new Map((partidos ?? []).map((p) => [p.id, p]));
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const refereeById = new Map((referees ?? []).map((r) => [r.id, r]));

  return (clips ?? []).map((c) => {
    const partido = partidoById.get(c.partido_id);
    return {
      id: c.id,
      partidoId: c.partido_id,
      partidoTemporada: partido?.temporada ?? "Sin fecha",
      fecha: partido?.fecha ?? null,
      teamLocal: partido?.team_local_id ? (teamById.get(partido.team_local_id) ?? null) : null,
      teamVisit: partido?.team_visit_id ? (teamById.get(partido.team_visit_id) ?? null) : null,
      referee: c.referee_id ? (refereeById.get(c.referee_id) ?? null) : null,
      title: c.title,
      situation: c.situation,
      quarter: c.quarter,
      clock: c.clock,
      evaluation: c.evaluation,
      whistleType: c.whistle_type,
    };
  });
}
