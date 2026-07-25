"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { colorForTeam } from "@/lib/constants";

export async function createCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para la categoría" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
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
      error: error?.code === "23505" ? "Esa categoría ya existe" : "No se pudo guardar la categoría",
    };
  }
  revalidatePath("/categories");
  revalidatePath("/competitions", "layout");
  return { ok: true as const, category: data };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar la categoría" };
  revalidatePath("/categories");
  revalidatePath("/competitions", "layout");
  return { ok: true as const };
}
