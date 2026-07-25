"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { colorForTeam } from "@/lib/constants";

export async function createReferee(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Poné un nombre para el árbitro" };
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("referees").insert({
    name: trimmed,
    color: colorForTeam(trimmed),
    created_by: profile.id,
  });
  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Ese árbitro ya está en el directorio" : "No se pudo guardar el árbitro",
    };
  }
  revalidatePath("/referees");
  revalidatePath("/competitions", "layout");
  return { ok: true as const };
}

export async function deleteReferee(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("referees").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar" };
  revalidatePath("/referees");
  revalidatePath("/competitions", "layout");
  return { ok: true as const };
}

export async function updateRefereePhotoUrl(id: string, url: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("referees").update({ photo_url: url }).eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar la foto" };
  revalidatePath("/referees");
  return { ok: true as const };
}

// Fusiona `sourceId` en `targetId`: reasigna clips y partido_referees, borra el duplicado.
export async function mergeReferees(sourceId: string, targetId: string) {
  if (sourceId === targetId) return { ok: false as const, error: "Elegí un árbitro distinto" };
  const supabase = await createClient();

  const { error: clipsError } = await supabase.from("clips").update({ referee_id: targetId }).eq("referee_id", sourceId);
  if (clipsError) return { ok: false as const, error: "No se pudo completar la fusión" };

  // partido_referees tiene PK (partido_id, position): si el target ya está en
  // el mismo partido, no reasignamos esa fila puntual (evita choque de UNIQUE).
  const { data: sourceRows } = await supabase
    .from("partido_referees")
    .select("partido_id, position")
    .eq("referee_id", sourceId);

  for (const row of sourceRows ?? []) {
    const { data: clash } = await supabase
      .from("partido_referees")
      .select("partido_id")
      .eq("partido_id", row.partido_id)
      .eq("referee_id", targetId)
      .maybeSingle();
    if (clash) {
      await supabase
        .from("partido_referees")
        .delete()
        .eq("partido_id", row.partido_id)
        .eq("position", row.position);
    } else {
      await supabase
        .from("partido_referees")
        .update({ referee_id: targetId })
        .eq("partido_id", row.partido_id)
        .eq("position", row.position);
    }
  }

  const { error: deleteError } = await supabase.from("referees").delete().eq("id", sourceId);
  if (deleteError) return { ok: false as const, error: "No se pudo eliminar el duplicado" };

  revalidatePath("/referees");
  revalidatePath("/competitions", "layout");
  return { ok: true as const, clipsMoved: (sourceRows ?? []).length };
}
