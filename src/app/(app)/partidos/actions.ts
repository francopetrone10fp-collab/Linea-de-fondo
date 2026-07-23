"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import type { Evaluation, Situation, WhistleType } from "@/lib/database.types";

export interface PartidoInput {
  fecha: string; // 'YYYY-MM-DD' o ''
  competition: string;
  notes: string;
  teamLocalId: string | null;
  teamVisitId: string | null;
  refereeIds: (string | null)[]; // hasta 3, en orden
}

async function setPartidoReferees(partidoId: string, refereeIds: (string | null)[]) {
  const supabase = await createClient();
  await supabase.from("partido_referees").delete().eq("partido_id", partidoId);
  const rows = refereeIds
    .map((refereeId, i) => ({ partido_id: partidoId, referee_id: refereeId, position: i + 1 }))
    .filter((r) => !!r.referee_id) as { partido_id: string; referee_id: string; position: number }[];
  if (rows.length > 0) await supabase.from("partido_referees").insert(rows);
}

export async function createPartido(input: PartidoInput) {
  const profile = await requireProfile();
  const refIds = input.refereeIds.filter(Boolean);
  if (refIds.length === 0) return { ok: false as const, error: "Elegí al menos un árbitro para el partido" };

  const supabase = await createClient();
  const { data: partido, error } = await supabase
    .from("partidos")
    .insert({
      fecha: input.fecha || null,
      competition: input.competition.trim() || null,
      notes: input.notes.trim() || null,
      team_local_id: input.teamLocalId,
      team_visit_id: input.teamVisitId,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !partido) return { ok: false as const, error: "No se pudo guardar el partido" };
  await setPartidoReferees(partido.id, input.refereeIds);

  revalidatePath("/partidos");
  return { ok: true as const, id: partido.id };
}

export async function updatePartido(id: string, input: PartidoInput) {
  const refIds = input.refereeIds.filter(Boolean);
  if (refIds.length === 0) return { ok: false as const, error: "Elegí al menos un árbitro para el partido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partidos")
    .update({
      fecha: input.fecha || null,
      competition: input.competition.trim() || null,
      notes: input.notes.trim() || null,
      team_local_id: input.teamLocalId,
      team_visit_id: input.teamVisitId,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo guardar el partido" };
  await setPartidoReferees(id, input.refereeIds);

  revalidatePath("/partidos", "layout");
  return { ok: true as const };
}

export async function deletePartido(id: string, temporada: string) {
  const supabase = await createClient();
  const { data: clipRows } = await supabase.from("clips").select("id").eq("partido_id", id);
  const clipIds = (clipRows ?? []).map((c) => c.id);

  if (clipIds.length > 0) {
    await supabase.from("comments").delete().eq("entity_type", "clip").in("entity_id", clipIds);
  }
  await supabase.from("comments").delete().eq("entity_type", "partido").eq("entity_id", id);
  const { error } = await supabase.from("partidos").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el partido" };

  revalidatePath("/partidos");
  redirect(`/partidos/${encodeURIComponent(temporada)}`);
}

export async function finalizePartido(id: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("partidos")
    .update({ finalized_by: profile.id, finalized_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo finalizar" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function reopenPartido(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("partidos").update({ finalized_by: null, finalized_at: null }).eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo reabrir" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function addComment(entityType: "partido" | "clip", entityId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false as const, error: "El comentario no puede estar vacío" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    entity_type: entityType,
    entity_id: entityId,
    author_id: profile.id,
    author_name: profile.name,
    author_role: profile.role,
    text: trimmed,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar el comentario" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function editComment(id: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false as const, error: "El comentario no puede quedar vacío" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .update({ text: trimmed, edited_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo guardar la edición" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function deleteComment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el comentario" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export interface ClipInput {
  partidoId: string;
  title: string;
  videoUrl: string;
  situation: Situation;
  quarter: string;
  clock: string;
  refereeId: string | null;
  notes: string;
  whistleType: WhistleType | null;
}

export async function createClip(input: ClipInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para el clip" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("clips").insert({
    partido_id: input.partidoId,
    title,
    video_url: input.videoUrl.trim() || null,
    situation: input.situation,
    quarter: input.quarter,
    clock: input.clock.trim() || null,
    referee_id: input.refereeId,
    notes: input.notes.trim() || null,
    whistle_type: input.whistleType,
    created_by: profile.id,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar el clip, probá de nuevo" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function updateClip(id: string, input: ClipInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para el clip" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clips")
    .update({
      title,
      video_url: input.videoUrl.trim() || null,
      situation: input.situation,
      quarter: input.quarter,
      clock: input.clock.trim() || null,
      referee_id: input.refereeId,
      notes: input.notes.trim() || null,
      whistle_type: input.whistleType,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo guardar el clip, probá de nuevo" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function deleteClip(id: string) {
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("entity_type", "clip").eq("entity_id", id);
  const { error } = await supabase.from("clips").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el clip" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function setClipEvaluation(id: string, evaluation: Evaluation | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("clips").update({ evaluation }).eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar la evaluación" };
  revalidatePath("/partidos");
  return { ok: true as const };
}

// Registra que el árbitro vio (entró en viewport) un clip puntual. Se llama
// muy seguido mientras se scrollea, así que no revalida la página — es solo
// progreso persistido en segundo plano para la primera confirmación.
export async function recordClipView(clipId: string) {
  const profile = await requireProfile();
  if (profile.role !== "arbitro" || !profile.referee_id) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("clip_views").insert({ clip_id: clipId, referee_id: profile.referee_id });
  if (error && error.code !== "23505") return { ok: false as const };
  return { ok: true as const };
}

// Confirmación explícita de lectura: el propio árbitro asignado toca el botón
// "Confirmar que vi este informe". No se marca automáticamente al abrir el
// partido. Solo válido sobre partidos finalizados donde el árbitro está
// asignado (lo mismo que exige la policy de RLS de partido_reads).
//
// Es un historial: cada llamada agrega una fila nueva, nunca reemplaza la
// anterior. La PRIMERA vez que un árbitro confirma un partido, exige haber
// visto (clip_views) todos los clips del partido; a partir de la segunda,
// queda libre.
export async function confirmPartidoRead(partidoId: string) {
  const profile = await requireProfile();
  if (profile.role !== "arbitro" || !profile.referee_id) {
    return { ok: false as const, error: "Solo un árbitro asignado puede confirmar la lectura" };
  }
  const supabase = await createClient();

  const { count: priorCount } = await supabase
    .from("partido_reads")
    .select("id", { count: "exact", head: true })
    .eq("partido_id", partidoId)
    .eq("referee_id", profile.referee_id);

  if (!priorCount) {
    const { data: clipRows } = await supabase.from("clips").select("id").eq("partido_id", partidoId);
    const clipIds = (clipRows ?? []).map((c) => c.id);
    if (clipIds.length > 0) {
      const { data: viewedRows } = await supabase
        .from("clip_views")
        .select("clip_id")
        .eq("referee_id", profile.referee_id)
        .in("clip_id", clipIds);
      const viewedCount = new Set((viewedRows ?? []).map((v) => v.clip_id)).size;
      if (viewedCount < clipIds.length) {
        return {
          ok: false as const,
          error: `Todavía tenés que ver todos los clips del partido (viste ${viewedCount} de ${clipIds.length}).`,
        };
      }
    }
  }

  const { error } = await supabase.from("partido_reads").insert({
    partido_id: partidoId,
    referee_id: profile.referee_id,
    confirmed_by: profile.id,
  });
  if (error) return { ok: false as const, error: "No se pudo confirmar la lectura" };
  revalidatePath("/partidos");
  return { ok: true as const };
}
