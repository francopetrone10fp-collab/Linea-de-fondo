"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import type { DesignacionEstado, Rama, TarifaModo } from "@/lib/database.types";

type DB = Awaited<ReturnType<typeof createClient>>;

// ---------- Tarifas por competencia + categoría ----------

export async function upsertTarifa(input: {
  competencia: string;
  categoria: string;
  modo: TarifaModo;
  montoArbitro: number;
  montoCt: number;
}) {
  const competencia = input.competencia.trim();
  const categoria = input.categoria.trim();
  if (!competencia) return { ok: false as const, error: "Poné la competencia" };
  if (!categoria) return { ok: false as const, error: "Poné el nombre de la categoría" };

  const supabase = await createClient();
  const { error } = await supabase.from("tarifas_categoria").upsert({
    competencia,
    categoria,
    modo: input.modo,
    monto_arbitro: input.montoArbitro,
    monto_ct: input.montoCt,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar la tarifa" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function deleteTarifa(competencia: string, categoria: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tarifas_categoria")
    .delete()
    .eq("competencia", competencia)
    .eq("categoria", categoria);
  if (error) return { ok: false as const, error: "No se pudo eliminar la tarifa" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// ---------- Viáticos por localidad (solo informativo) ----------

export async function upsertViatico(localidad: string, monto: number) {
  const trimmed = localidad.trim();
  if (!trimmed) return { ok: false as const, error: "Poné el nombre de la localidad" };

  const supabase = await createClient();
  const { error } = await supabase.from("viaticos_localidad").upsert({ localidad: trimmed, monto });
  if (error) return { ok: false as const, error: "No se pudo guardar el viático" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function deleteViatico(localidad: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("viaticos_localidad").delete().eq("localidad", localidad);
  if (error) return { ok: false as const, error: "No se pudo eliminar el viático" };
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
  localidad: string;
  estado: DesignacionEstado;
  notas: string;
}

async function fetchTarifa(supabase: DB, competencia: string | null, categoria: string) {
  const { data } = await supabase
    .from("tarifas_categoria")
    .select("modo, monto_arbitro, monto_ct")
    .eq("competencia", competencia ?? "")
    .eq("categoria", categoria)
    .maybeSingle();
  return data;
}

// Recalcula el monto de TODOS los árbitros asignados a una designación.
// Necesario porque en modo "total_partido" (ej. Pre-mini/Mini) el monto de
// cada uno depende de cuántos árbitros asistieron en total: si se agrega o
// saca un árbitro, hay que repartir de nuevo entre los que quedan.
async function recalcularMontosArbitros(supabase: DB, designacionId: string, competencia: string | null, categoria: string) {
  const tarifa = await fetchTarifa(supabase, competencia, categoria);
  const { data: asignados } = await supabase
    .from("designacion_arbitros")
    .select("posicion")
    .eq("designacion_id", designacionId);

  const cantidad = asignados?.length ?? 0;
  if (cantidad === 0) return;

  const base = tarifa?.monto_arbitro ?? 0;
  const monto = tarifa?.modo === "total_partido" ? base / cantidad : base;

  await supabase.from("designacion_arbitros").update({ monto }).eq("designacion_id", designacionId);
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
      localidad: input.localidad.trim() || null,
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

  const competencia = input.competencia.trim() || null;
  const supabase = await createClient();
  const { error } = await supabase
    .from("designaciones")
    .update({
      jornada: input.jornada.trim() || null,
      fecha: input.fecha || null,
      hora: input.hora || null,
      categoria,
      competencia,
      rama: input.rama || null,
      equipo_local: equipoLocal,
      equipo_visitante: equipoVisitante,
      sede: input.sede.trim() || null,
      localidad: input.localidad.trim() || null,
      estado: input.estado,
      notas: input.notas.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar la designación" };

  // La categoría/competencia pudo haber cambiado: recalculamos los montos
  // ya asignados para que reflejen la tarifa correcta.
  await recalcularMontosArbitros(supabase, id, competencia, categoria);
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
// frecuente hasta el mismo día del partido.
export async function setDesignacionArbitro(designacionId: string, posicion: 1 | 2 | 3, refereeId: string | null) {
  const supabase = await createClient();

  const { data: designacion } = await supabase
    .from("designaciones")
    .select("competencia, categoria")
    .eq("id", designacionId)
    .single();
  if (!designacion) return { ok: false as const, error: "Designación no encontrada" };

  if (refereeId) {
    const { error } = await supabase
      .from("designacion_arbitros")
      .upsert({ designacion_id: designacionId, posicion, referee_id: refereeId, monto: 0 });
    if (error) return { ok: false as const, error: "No se pudo asignar el árbitro" };
  } else {
    const { error } = await supabase
      .from("designacion_arbitros")
      .delete()
      .eq("designacion_id", designacionId)
      .eq("posicion", posicion);
    if (error) return { ok: false as const, error: "No se pudo quitar el árbitro" };
  }

  await recalcularMontosArbitros(supabase, designacionId, designacion.competencia, designacion.categoria);
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
      .select("competencia, categoria")
      .eq("id", designacionId)
      .single();
    if (designacion) {
      const tarifa = await fetchTarifa(supabase, designacion.competencia, designacion.categoria);
      ctMonto = tarifa?.monto_ct ?? 0;
    }
  }

  const { error } = await supabase
    .from("designaciones")
    .update({ ct_nombre: ctNombre, ct_monto: ctMonto })
    .eq("id", designacionId);
  if (error) return { ok: false as const, error: "No se pudo guardar el comisionado técnico" };
  revalidatePath("/designaciones");
  return { ok: true as const };
}
