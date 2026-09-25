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

  // designacion_arbitros y partido_referees no dejan borrar un árbitro que
  // todavía tiene partidos asignados (a propósito: nunca se pierde solo por
  // un click el historial de a quién se le pagó qué). Chequeamos antes para
  // poder explicar el motivo real en vez de un genérico "no se pudo".
  const [{ count: designacionesCount }, { count: partidosCount }] = await Promise.all([
    supabase.from("designacion_arbitros").select("designacion_id", { count: "exact", head: true }).eq("referee_id", id),
    supabase.from("partido_referees").select("partido_id", { count: "exact", head: true }).eq("referee_id", id),
  ]);
  if ((designacionesCount ?? 0) > 0 || (partidosCount ?? 0) > 0) {
    const partes = [];
    if (designacionesCount) partes.push(`${designacionesCount} designación${designacionesCount === 1 ? "" : "es"}`);
    if (partidosCount) partes.push(`${partidosCount} partido${partidosCount === 1 ? "" : "s"} de video`);
    return {
      ok: false as const,
      error: `No se puede eliminar: tiene ${partes.join(" y ")} asignados. Si es un duplicado, fusionalo con el árbitro correcto en vez de borrarlo.`,
    };
  }

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

// Se guarda como dígitos locales (código de área + número, sin 0/15/9), para
// que armar los links de WhatsApp/llamada en Designaciones sea directo.
export async function updateRefereeTelefono(id: string, telefono: string) {
  const digits = telefono.replace(/[^0-9]/g, "");
  const supabase = await createClient();
  const { error } = await supabase.from("referees").update({ telefono: digits || null }).eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar el teléfono" };
  revalidatePath("/referees");
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// Fusiona `sourceId` en `targetId`: reasigna todo lo que tenga cargado
// (clips, partidos de video, designaciones, confirmaciones y
// disponibilidad) al árbitro correcto, y borra el duplicado.
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

  // designacion_arbitros tiene PK (designacion_id, posicion), no por
  // referee_id: si el target ya está en ese mismo partido (en otra
  // posición), no lo duplicamos ahí — se descarta esa fila del source.
  const { data: designacionRows } = await supabase
    .from("designacion_arbitros")
    .select("designacion_id, posicion")
    .eq("referee_id", sourceId);

  for (const row of designacionRows ?? []) {
    const { data: clash } = await supabase
      .from("designacion_arbitros")
      .select("designacion_id")
      .eq("designacion_id", row.designacion_id)
      .eq("referee_id", targetId)
      .maybeSingle();
    if (clash) {
      await supabase
        .from("designacion_arbitros")
        .delete()
        .eq("designacion_id", row.designacion_id)
        .eq("posicion", row.posicion);
    } else {
      await supabase
        .from("designacion_arbitros")
        .update({ referee_id: targetId })
        .eq("designacion_id", row.designacion_id)
        .eq("posicion", row.posicion);
    }
  }

  // designacion_confirmaciones: PK (designacion_id, referee_id) — si el
  // target ya había confirmado ese mismo partido, la del source sobra.
  const { data: confirmacionRows } = await supabase
    .from("designacion_confirmaciones")
    .select("designacion_id")
    .eq("referee_id", sourceId);

  for (const row of confirmacionRows ?? []) {
    const { data: clash } = await supabase
      .from("designacion_confirmaciones")
      .select("designacion_id")
      .eq("designacion_id", row.designacion_id)
      .eq("referee_id", targetId)
      .maybeSingle();
    if (clash) {
      await supabase
        .from("designacion_confirmaciones")
        .delete()
        .eq("designacion_id", row.designacion_id)
        .eq("referee_id", sourceId);
    } else {
      await supabase
        .from("designacion_confirmaciones")
        .update({ referee_id: targetId })
        .eq("designacion_id", row.designacion_id)
        .eq("referee_id", sourceId);
    }
  }

  // disponibilidades: unique (referee_id, fecha) — si el target ya cargó su
  // propia disponibilidad para esa fecha, esa respuesta manda y la del
  // source se descarta.
  const { data: disponibilidadRows } = await supabase.from("disponibilidades").select("fecha").eq("referee_id", sourceId);

  for (const row of disponibilidadRows ?? []) {
    const { data: clash } = await supabase
      .from("disponibilidades")
      .select("id")
      .eq("referee_id", targetId)
      .eq("fecha", row.fecha)
      .maybeSingle();
    if (clash) {
      await supabase.from("disponibilidades").delete().eq("referee_id", sourceId).eq("fecha", row.fecha);
    } else {
      await supabase.from("disponibilidades").update({ referee_id: targetId }).eq("referee_id", sourceId).eq("fecha", row.fecha);
    }
  }

  // Si el duplicado tenía un perfil de usuario vinculado, se lo pasamos al
  // árbitro correcto (así no pierde su cuenta ni sus notificaciones).
  await supabase.from("profiles").update({ referee_id: targetId }).eq("referee_id", sourceId);

  const { error: deleteError } = await supabase.from("referees").delete().eq("id", sourceId);
  if (deleteError) return { ok: false as const, error: "No se pudo eliminar el duplicado" };

  revalidatePath("/referees");
  revalidatePath("/designaciones");
  revalidatePath("/disponibilidad");
  revalidatePath("/competitions", "layout");
  return { ok: true as const, clipsMoved: (sourceRows ?? []).length };
}
