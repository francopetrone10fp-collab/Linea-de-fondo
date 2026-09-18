"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";

// Guarda (o borra, si querés volver a "sin responder") la disponibilidad de
// un árbitro para un día puntual. Entre semana `categorias` va vacío; el
// fin de semana `disponible` se deriva de si eligió alguna categoría o
// marcó "no disponible".
export async function setDisponibilidadDia(fecha: string, disponible: boolean, categorias: string[]) {
  const profile = await requireProfile();
  if (!profile.referee_id) return { ok: false as const, error: "Tu perfil no está vinculado a un árbitro" };

  const supabase = await createClient();
  const { error } = await supabase.from("disponibilidades").upsert(
    {
      referee_id: profile.referee_id,
      fecha,
      disponible,
      categorias,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "referee_id,fecha" }
  );
  if (error) return { ok: false as const, error: "No se pudo guardar la disponibilidad" };
  revalidatePath("/disponibilidad");
  return { ok: true as const };
}

// Desmarca todo lo cargado para un día puntual, volviendo a "sin responder".
export async function clearDisponibilidadDia(fecha: string) {
  const profile = await requireProfile();
  if (!profile.referee_id) return { ok: false as const, error: "Tu perfil no está vinculado a un árbitro" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("disponibilidades")
    .delete()
    .eq("referee_id", profile.referee_id)
    .eq("fecha", fecha);
  if (error) return { ok: false as const, error: "No se pudo desmarcar" };
  revalidatePath("/disponibilidad");
  return { ok: true as const };
}

// Mismo par de acciones, pero para que el coordinador general edite la
// disponibilidad de cualquier árbitro (por ejemplo, cuando alguien no puede
// o no sabe cargarla solo).
export async function setDisponibilidadDiaArbitro(refereeId: string, fecha: string, disponible: boolean, categorias: string[]) {
  const profile = await requireProfile();
  if (!isCoordinador(profile)) return { ok: false as const, error: "No tenés permiso para editar la disponibilidad de otro árbitro" };

  const supabase = await createClient();
  const { error } = await supabase.from("disponibilidades").upsert(
    { referee_id: refereeId, fecha, disponible, categorias, updated_at: new Date().toISOString() },
    { onConflict: "referee_id,fecha" }
  );
  if (error) return { ok: false as const, error: "No se pudo guardar la disponibilidad" };
  revalidatePath("/disponibilidad");
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function clearDisponibilidadDiaArbitro(refereeId: string, fecha: string) {
  const profile = await requireProfile();
  if (!isCoordinador(profile)) return { ok: false as const, error: "No tenés permiso para editar la disponibilidad de otro árbitro" };

  const supabase = await createClient();
  const { error } = await supabase.from("disponibilidades").delete().eq("referee_id", refereeId).eq("fecha", fecha);
  if (error) return { ok: false as const, error: "No se pudo desmarcar" };
  revalidatePath("/disponibilidad");
  revalidatePath("/designaciones");
  return { ok: true as const };
}
