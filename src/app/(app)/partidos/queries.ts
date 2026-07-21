import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Evaluation, Situation } from "@/lib/database.types";

export interface DirectoryEntry {
  id: string;
  name: string;
  color: string;
  photo_url?: string | null;
}

export interface PartidoFull {
  id: string;
  fecha: string | null;
  temporada: string;
  competition: string | null;
  notes: string | null;
  finalizedAt: string | null;
  finalizedByName: string | null;
  teamLocal: DirectoryEntry | null;
  teamVisit: DirectoryEntry | null;
  referees: DirectoryEntry[];
  createdBy: string;
  createdAt: string;
}

export interface ClipFull {
  id: string;
  partidoId: string;
  title: string;
  videoUrl: string | null;
  situation: Situation;
  quarter: string;
  clock: string | null;
  notes: string | null;
  evaluation: Evaluation | null;
  createdAt: string;
  referee: DirectoryEntry | null;
}

export interface CommentFull {
  id: string;
  entityType: "partido" | "clip";
  entityId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
}

type DB = SupabaseClient<Database>;

export async function fetchPartidosFull(supabase: DB): Promise<PartidoFull[]> {
  const [{ data: partidos }, { data: teams }, { data: referees }, { data: partidoReferees }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("partidos")
        .select("*")
        .order("fecha", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("teams").select("id, name, color"),
      supabase.from("referees").select("id, name, color, photo_url"),
      supabase.from("partido_referees").select("partido_id, referee_id, position").order("position"),
      supabase.from("profiles").select("id, name"),
    ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const refereeById = new Map((referees ?? []).map((r) => [r.id, r]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  const refsByPartido = new Map<string, DirectoryEntry[]>();
  (partidoReferees ?? []).forEach((pr) => {
    const ref = refereeById.get(pr.referee_id);
    if (!ref) return;
    const list = refsByPartido.get(pr.partido_id) ?? [];
    list.push(ref);
    refsByPartido.set(pr.partido_id, list);
  });

  return (partidos ?? []).map((p) => ({
    id: p.id,
    fecha: p.fecha,
    temporada: p.temporada,
    competition: p.competition,
    notes: p.notes,
    finalizedAt: p.finalized_at,
    finalizedByName: p.finalized_by ? (nameById.get(p.finalized_by) ?? null) : null,
    teamLocal: p.team_local_id ? (teamById.get(p.team_local_id) ?? null) : null,
    teamVisit: p.team_visit_id ? (teamById.get(p.team_visit_id) ?? null) : null,
    referees: refsByPartido.get(p.id) ?? [],
    createdBy: p.created_by,
    createdAt: p.created_at,
  }));
}

export async function fetchClipsForPartido(supabase: DB, partidoId: string): Promise<ClipFull[]> {
  const [{ data: clips }, { data: referees }] = await Promise.all([
    supabase.from("clips").select("*").eq("partido_id", partidoId).order("created_at", { ascending: false }),
    supabase.from("referees").select("id, name, color, photo_url"),
  ]);
  const refereeById = new Map((referees ?? []).map((r) => [r.id, r]));
  return (clips ?? []).map((c) => ({
    id: c.id,
    partidoId: c.partido_id,
    title: c.title,
    videoUrl: c.video_url,
    situation: c.situation,
    quarter: c.quarter,
    clock: c.clock,
    notes: c.notes,
    evaluation: c.evaluation,
    createdAt: c.created_at,
    referee: c.referee_id ? (refereeById.get(c.referee_id) ?? null) : null,
  }));
}

export async function fetchComments(supabase: DB, entityType: "partido" | "clip", entityId: string): Promise<CommentFull[]> {
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at");
  return (data ?? []).map((c) => ({
    id: c.id,
    entityType: c.entity_type,
    entityId: c.entity_id,
    authorName: c.author_name,
    authorRole: c.author_role,
    text: c.text,
    createdAt: c.created_at,
    editedAt: c.edited_at,
  }));
}

export async function fetchAllClipsMinimal(supabase: DB) {
  const { data } = await supabase.from("clips").select("id, partido_id, situation, evaluation, referee_id");
  return data ?? [];
}
