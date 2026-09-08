"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { sanitizeVideoUrl } from "@/lib/video-embed";
import type { ClassLevel } from "@/lib/database.types";

// ---------- Años ----------

export async function createClassYear(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para el año" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_years")
    .insert({ name: trimmed, created_by: profile.id })
    .select("id, name")
    .single();
  if (error || !data) {
    return {
      ok: false as const,
      error: error?.code === "23505" ? "Ese año ya existe" : "No se pudo guardar el año",
    };
  }
  revalidatePath("/clases");
  return { ok: true as const, year: data };
}

export async function deleteClassYear(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_years").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el año" };
  revalidatePath("/clases");
  return { ok: true as const };
}

// ---------- Clases ----------

export interface ClassInput {
  title: string;
  videoUrl: string;
  notes: string;
  levels: ClassLevel[];
}

export async function createClass(yearId: string, input: ClassInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para la clase" };

  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({
      year_id: yearId,
      title,
      video_url: sanitizeVideoUrl(input.videoUrl) || null,
      notes: input.notes.trim() || null,
      levels: input.levels,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: "No se pudo guardar la clase" };
  revalidatePath("/clases");
  return { ok: true as const, id: data.id };
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
      levels: input.levels,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar la clase" };
  revalidatePath("/clases");
  return { ok: true as const };
}

export async function deleteClass(id: string, yearId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar la clase" };
  revalidatePath(`/clases/${yearId}`);
  revalidatePath("/clases");
  return { ok: true as const };
}

// ---------- Clips de clase ----------

export interface ClassClipInput {
  title: string;
  videoUrl: string;
  notes: string;
}

export async function createClassClip(classId: string, input: ClassClipInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para el clip" };

  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("class_clips").insert({
    class_id: classId,
    title,
    video_url: sanitizeVideoUrl(input.videoUrl) || null,
    notes: input.notes.trim() || null,
    created_by: profile.id,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar el clip" };
  revalidatePath("/clases", "layout");
  return { ok: true as const };
}

export async function updateClassClip(id: string, input: ClassClipInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Poné un título para el clip" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_clips")
    .update({
      title,
      video_url: sanitizeVideoUrl(input.videoUrl) || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar el clip" };
  revalidatePath("/clases", "layout");
  return { ok: true as const };
}

export async function deleteClassClip(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_clips").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar el clip" };
  revalidatePath("/clases", "layout");
  return { ok: true as const };
}

// ---------- Material vinculado ----------

export async function linkClassMaterial(classId: string, materialId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_materials")
    .insert({ class_id: classId, material_id: materialId, created_by: profile.id });
  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Ese material ya está vinculado" : "No se pudo vincular el material",
    };
  }
  revalidatePath("/clases", "layout");
  return { ok: true as const };
}

export async function unlinkClassMaterial(classId: string, materialId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_materials")
    .delete()
    .eq("class_id", classId)
    .eq("material_id", materialId);
  if (error) return { ok: false as const, error: "No se pudo desvincular el material" };
  revalidatePath("/clases", "layout");
  return { ok: true as const };
}
