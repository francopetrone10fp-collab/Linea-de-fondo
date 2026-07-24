"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import type { MaterialType } from "@/lib/database.types";

export async function createMaterial(input: {
  title: string;
  type: MaterialType;
  url: string;
  description: string;
}) {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) return { ok: false as const, error: "Poné un título para el material" };
  if (!url) return { ok: false as const, error: "Pegá un link" };

  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("materials").insert({
    title,
    type: input.type,
    url,
    description: input.description.trim() || null,
    created_by: profile.id,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar el material" };
  revalidatePath("/material");
  return { ok: true as const };
}

export async function updateMaterial(
  id: string,
  input: {
    title: string;
    type: MaterialType;
    url: string;
    description: string;
  }
) {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) return { ok: false as const, error: "Poné un título para el material" };
  if (!url) return { ok: false as const, error: "Pegá un link" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({
      title,
      type: input.type,
      url,
      description: input.description.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar el material" };
  revalidatePath("/material");
  return { ok: true as const };
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el material" };
  revalidatePath("/material");
  return { ok: true as const };
}
