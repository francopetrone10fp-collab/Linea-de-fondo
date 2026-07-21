"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { colorForTeam } from "@/lib/constants";

export async function createTeam(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para el equipo" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    name: trimmed,
    color: colorForTeam(trimmed),
    created_by: profile.id,
  });
  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Ese equipo ya existe" : "No se pudo guardar el equipo",
    };
  }
  revalidatePath("/teams");
  revalidatePath("/partidos");
  return { ok: true as const };
}

export async function deleteTeam(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el equipo" };
  revalidatePath("/teams");
  revalidatePath("/partidos");
  return { ok: true as const };
}
