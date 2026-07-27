"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { colorForTeam } from "@/lib/constants";

export async function createCompetition(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para la competencia" };
  const profile = await requireProfile();
  if (!isCoordinador(profile)) {
    return { ok: false as const, error: "Solo Coordinador General puede crear competencias" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      name: trimmed,
      color: colorForTeam(trimmed),
      created_by: profile.id,
    })
    .select("id, name, color")
    .single();
  if (error || !data) {
    return {
      ok: false as const,
      error: error?.code === "23505" ? "Esa competencia ya existe" : "No se pudo guardar la competencia",
    };
  }
  revalidatePath("/competitions", "layout");
  return { ok: true as const, competition: data };
}

export async function deleteCompetition(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar la competencia" };
  revalidatePath("/competitions", "layout");
  return { ok: true as const };
}

// La temporada es una entidad propia por competencia (no solo un valor
// derivado del año de los partidos), para poder crearla vacía y que no
// desaparezca si después se borran todos sus partidos.
export async function createSeason(competitionId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para la temporada" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .insert({
      competition_id: competitionId,
      name: trimmed,
      created_by: profile.id,
    })
    .select("id, name")
    .single();
  if (error || !data) {
    return {
      ok: false as const,
      error: error?.code === "23505" ? "Esa temporada ya existe en esta competencia" : "No se pudo guardar la temporada",
    };
  }
  revalidatePath("/competitions", "layout");
  return { ok: true as const, season: data };
}
