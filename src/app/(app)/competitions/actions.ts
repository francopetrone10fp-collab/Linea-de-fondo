"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { colorForTeam } from "@/lib/constants";

export async function createCompetition(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para la competencia" };
  const profile = await requireProfile();
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
