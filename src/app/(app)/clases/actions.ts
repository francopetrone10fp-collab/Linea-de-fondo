"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { sanitizeVideoUrl } from "@/lib/video-embed";

export interface ClassInput {
  title: string;
  videoUrl: string;
  notes: string;
}

export async function createClass(input: ClassInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para la clase" };

  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({
    title,
    video_url: sanitizeVideoUrl(input.videoUrl) || null,
    notes: input.notes.trim() || null,
    created_by: profile.id,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar la clase" };
  revalidatePath("/clases");
  return { ok: true as const };
}

export async function updateClass(id: string, input: ClassInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para la clase" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      title,
      video_url: sanitizeVideoUrl(input.videoUrl) || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar la clase" };
  revalidatePath("/clases");
  return { ok: true as const };
}

export async function deleteClass(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar la clase" };
  revalidatePath("/clases");
  return { ok: true as const };
}
