"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import type { DesignacionEstado, Rama } from "@/lib/database.types";

// ---------- Tarifas por categoría ----------

export async function upsertTarifa(input: {
  categoria: string;
  montoArbitro1: number;
  montoArbitro2: number;
  montoCt: number;
}) {
  const categoria = input.categoria.trim();
  if (!categoria) return { ok: false as const, error: "Poné el nombre de la categoría" };

  const supabase = await createClient();
  const { error } = await supabase.from("tarifas_categoria").upsert({
    categoria,
    monto_arbitro_1: input.montoArbitro1,
    monto_arbitro_2: input.montoArbitro2,
    monto_ct: input.montoCt,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar la tarifa" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function deleteTarifa(categoria: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tarifas_categoria").delete().eq("categoria", categoria);
  if (error) return { ok: false as const, error: "No se pudo eliminar la tarifa" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// ---------- Designaciones ----------

export interface DesignacionInput {
  jornada: string;
  fecha: string;
  hora: string;
  categoria: string;
  competencia: string;
  rama: Rama | "";
  equipoLocal: string;
  equipoVisitante: string;
  sede: string;
  estado: DesignacionEstado;
  notas: string;
}

async function montoParaCategoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoria: string,
  campo: "monto_arbitro_1" | "monto_arbitro_2" | "monto_ct"
) {
  const { data } = await supabase
    .from("tarifas_categoria")
    .select("monto_arbitro_1, monto_arbitro_2, monto_ct")
    .eq("categoria", categoria)
    .maybeSingle();
  return data?.[campo] ?? 0;
}

export async function createDesignacion(input: DesignacionInput) {
  const categoria = input.categoria.trim();
  const equipoLocal = input.equipoLocal.trim();
  const equipoVisitante = input.equipoVisitante.trim();
  if (!categoria) return { ok: false as const, error: "Poné la categoría" };
  if (!equipoLocal || !equipoVisitante) return { ok: false as const, error: "Poné local y visitante" };

  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("designaciones")
    .insert({
      jornada: input.jornada.trim() || null,
      fecha: input.fecha || null,
      hora: input.hora || null,
      categoria,
      competencia: input.competencia.trim() || null,
      rama: input.rama || null,
      equipo_local: equipoLocal,
      equipo_visitante: equipoVisitante,
      sede: input.sede.trim() || null,
      estado: input.estado,
      notas: input.notas.trim() || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: "No se pudo crear la designación" };
  revalidatePath("/designaciones");
  return { ok: true as const, id: data.id };
}

export async function updateDesignacion(id: string, input: DesignacionInput) {
  const categoria = input.categoria.trim();
  const equipoLocal = input.equipoLocal.trim();
  const equipoVisitante = input.equipoVisitante.trim();
  if (!categoria) return { ok: false as const, error: "Poné la categoría" };
  if (!equipoLocal || !equipoVisitante) return { ok: false as const, error: "Poné local y visitante" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("designaciones")
    .update({
      jornada: input.jornada.trim() || null,
      fecha: input.fecha || null,
      hora: input.hora || null,
      categoria,
      competencia: input.competencia.trim() || null,
      rama: input.rama || null,
      equipo_local: equipoLocal,
      equipo_visitante: equipoVisitante,
      sede: input.sede.trim() || null,
      estado: input.estado,
      notas: input.notas.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar la designación" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// Cambio rápido de estado (el uso típico del mismo día del partido:
// suspender, confirmar, etc.) sin abrir el formulario completo.
export async function setDesignacionEstado(id: string, estado: DesignacionEstado) {
  const supabase = await createClient();
  const { error } = await supabase.from("designaciones").update({ estado }).eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar el estado" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function deleteDesignacion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("designaciones").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar la designación" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// ---------- Árbitros asignados ----------

// Cambio rápido de árbitro en una posición (1, 2 o 3): es el ajuste más
// frecuente hasta el mismo día del partido. El monto se recalcula solo
// desde la tarifa vigente de la categoría del partido.
export async function setDesignacionArbitro(designacionId: string, posicion: 1 | 2 | 3, refereeId: string | null) {
  const supabase = await createClient();

  if (!refereeId) {
    const { error } = await supabase
      .from("designacion_arbitros")
      .delete()
      .eq("designacion_id", designacionId)
      .eq("posicion", posicion);
    if (error) return { ok: false as const, error: "No se pudo quitar el árbitro" };
    revalidatePath("/designaciones");
    return { ok: true as const };
  }

  const { data: designacion } = await supabase
    .from("designaciones")
    .select("categoria")
    .eq("id", designacionId)
    .single();
  if (!designacion) return { ok: false as const, error: "Designación no encontrada" };

  const monto = await montoParaCategoria(supabase, designacion.categoria, posicion === 1 ? "monto_arbitro_1" : "monto_arbitro_2");

  const { error } = await supabase
    .from("designacion_arbitros")
    .upsert({ designacion_id: designacionId, posicion, referee_id: refereeId, monto });
  if (error) return { ok: false as const, error: "No se pudo asignar el árbitro" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// El comisionado técnico es informativo (no tiene perfil ni cuenta), así
// que se guarda como nombre libre directamente en la designación.
export async function setDesignacionCt(designacionId: string, nombre: string) {
  const supabase = await createClient();
  const ctNombre = nombre.trim() || null;

  let ctMonto: number | null = null;
  if (ctNombre) {
    const { data: designacion } = await supabase
      .from("designaciones")
      .select("categoria")
      .eq("id", designacionId)
      .single();
    if (designacion) ctMonto = await montoParaCategoria(supabase, designacion.categoria, "monto_ct");
  }

  const { error } = await supabase
    .from("designaciones")
    .update({ ct_nombre: ctNombre, ct_monto: ctMonto })
    .eq("id", designacionId);
  if (error) return { ok: false as const, error: "No se pudo guardar el comisionado técnico" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}
