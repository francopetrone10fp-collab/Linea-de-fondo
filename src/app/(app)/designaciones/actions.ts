"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";
import { sendPushToProfiles } from "@/lib/push/send";
import { disponibilidadBlockReason } from "@/lib/constants";
import type { Database, DesignacionEstado, Rama, TarifaModo } from "@/lib/database.types";

type DB = Awaited<ReturnType<typeof createClient>>;

// Marca la campana de notificaciones (confirmaciones de árbitros) como
// vista, para que no vuelvan a contar como nuevas la próxima vez.
export async function marcarNotificacionesVistas() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("profiles").update({ designaciones_bell_seen_at: new Date().toISOString() }).eq("id", profile.id);
}

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

// Cambio rápido de observaciones (visibles para los árbitros designados en
// "Mis designaciones"), sin abrir el formulario completo.
export async function setDesignacionNotas(id: string, notas: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("designaciones")
    .update({ notas: notas.trim() || null })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudieron guardar las observaciones" };
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

// ¿Este árbitro ya está designado en OTRO partido a la misma fecha y hora?
// Físicamente no puede dirigir dos partidos al mismo tiempo, así que esto
// bloquea la asignación en vez de dejar cargar el error.
async function refereeConflicto(
  supabase: DB,
  refereeId: string,
  fecha: string | null,
  hora: string | null,
  excludeDesignacionId: string
) {
  if (!fecha || !hora) return null;
  const { data: mismoHorario } = await supabase
    .from("designaciones")
    .select("id, categoria, equipo_local, equipo_visitante")
    .eq("fecha", fecha)
    .eq("hora", hora)
    .neq("id", excludeDesignacionId);
  if (!mismoHorario || mismoHorario.length === 0) return null;

  const { data: asignado } = await supabase
    .from("designacion_arbitros")
    .select("designacion_id")
    .eq("referee_id", refereeId)
    .in(
      "designacion_id",
      mismoHorario.map((d) => d.id)
    )
    .limit(1)
    .maybeSingle();
  if (!asignado) return null;
  return mismoHorario.find((d) => d.id === asignado.designacion_id) ?? null;
}

// Cambio rápido de árbitro en una posición (1, 2 o 3): es el ajuste más
// frecuente hasta el mismo día del partido.
export async function setDesignacionArbitro(designacionId: string, posicion: 1 | 2 | 3, refereeId: string | null) {
  const supabase = await createClient();

  const { data: designacion } = await supabase
    .from("designaciones")
    .select("competencia, categoria, estado, fecha, hora, equipo_local, equipo_visitante")
    .eq("id", designacionId)
    .single();
  if (!designacion) return { ok: false as const, error: "Designación no encontrada" };

  if (refereeId) {
    const conflicto = await refereeConflicto(supabase, refereeId, designacion.fecha, designacion.hora, designacionId);
    if (conflicto) {
      return {
        ok: false as const,
        error: `Ya está designado a esa hora en ${conflicto.equipo_local} vs ${conflicto.equipo_visitante} (${conflicto.categoria}).`,
      };
    }

    if (designacion.fecha) {
      const { data: disponibilidad } = await supabase
        .from("disponibilidades")
        .select("disponible, categorias")
        .eq("referee_id", refereeId)
        .eq("fecha", designacion.fecha)
        .maybeSingle();
      const bloqueo = disponibilidadBlockReason(disponibilidad, designacion.fecha, designacion.categoria);
      if (bloqueo) return { ok: false as const, error: bloqueo };
    }

    // Se guarda sin publicar: todavía no le aparece al árbitro en su perfil
    // ni le llega la notificación — eso pasa recién cuando el coordinador
    // hace click en "Confirmar" (confirmarArbitro más abajo). Así hay margen
    // para corregir un error de tipeo antes de que el árbitro se entere.
    const { error } = await supabase
      .from("designacion_arbitros")
      .upsert({ designacion_id: designacionId, posicion, referee_id: refereeId, monto: 0, publicado: false });
    if (error) return { ok: false as const, error: "No se pudo asignar el árbitro" };
  } else {
    const { error } = await supabase
      .from("designacion_arbitros")
      .delete()
      .eq("designacion_id", designacionId)
      .eq("posicion", posicion);
    if (error) return { ok: false as const, error: "No se pudo quitar el árbitro" };
  }

  // Si el partido ya estaba confirmado por todos y ahora cambió la terna,
  // esa confirmación quedó vieja: vuelve a "programado" hasta que confirmen
  // de nuevo (la designacion_confirmaciones anterior del árbitro que salió
  // deja de contar sola, porque el chequeo compara contra los asignados
  // actuales).
  if (designacion.estado === "confirmado") {
    await supabase.from("designaciones").update({ estado: "programado" }).eq("id", designacionId);
  }

  await recalcularMontosArbitros(supabase, designacionId, designacion.competencia, designacion.categoria);
  revalidatePath("/designaciones");
  return { ok: true as const };
}

// Publica una designación de árbitro que quedó sin confirmar (ver el
// comentario en setDesignacionArbitro): recién ahí le aparece al árbitro en
// "Mis designaciones" y le llega la notificación.
export async function confirmarArbitro(designacionId: string, posicion: 1 | 2 | 3) {
  const supabase = await createClient();

  const { data: fila } = await supabase
    .from("designacion_arbitros")
    .select("referee_id, publicado")
    .eq("designacion_id", designacionId)
    .eq("posicion", posicion)
    .maybeSingle();
  if (!fila) return { ok: false as const, error: "No se encontró esa asignación" };
  if (fila.publicado) return { ok: true as const };

  const { error } = await supabase
    .from("designacion_arbitros")
    .update({ publicado: true })
    .eq("designacion_id", designacionId)
    .eq("posicion", posicion);
  if (error) return { ok: false as const, error: "No se pudo confirmar" };

  const { data: designacion } = await supabase
    .from("designaciones")
    .select("fecha, hora, equipo_local, equipo_visitante")
    .eq("id", designacionId)
    .single();
  const { data: prof } = await supabase.from("profiles").select("id").eq("referee_id", fila.referee_id).maybeSingle();
  if (designacion && prof) {
    const cuando = [
      designacion.fecha ? new Date(designacion.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : null,
      designacion.hora?.slice(0, 5),
    ]
      .filter(Boolean)
      .join(" · ");
    sendPushToProfiles([prof.id], {
      title: "Te designaron a un partido",
      body: `${designacion.equipo_local} vs ${designacion.equipo_visitante}${cuando ? ` · ${cuando}` : ""}`,
      url: "/designaciones",
      image: `/api/notificaciones/imagen?local=${encodeURIComponent(designacion.equipo_local)}&visitante=${encodeURIComponent(designacion.equipo_visitante)}`,
    }).catch(() => {});
  }

  revalidatePath("/designaciones");
  return { ok: true as const };
}

// El árbitro confirma que va a dirigir este partido. Como designaciones_update
// es coordinador-only por RLS, el cambio de estado a "confirmado" (cuando ya
// confirmaron todos los asignados) pasa por una función SECURITY DEFINER.
export async function confirmDesignacion(designacionId: string) {
  const profile = await requireProfile();
  if (!profile.referee_id) return { ok: false as const, error: "Tu perfil no está vinculado a un árbitro" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("designacion_confirmaciones")
    .upsert({ designacion_id: designacionId, referee_id: profile.referee_id });
  if (error) return { ok: false as const, error: "No se pudo confirmar" };

  await supabase.rpc("recalcular_confirmacion_designacion", { p_designacion_id: designacionId });
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

// ---------- Importación masiva (pegado desde la planilla de Drive) ----------

export interface BulkImportRow {
  jornada: string | null;
  fecha: string | null;
  hora: string | null;
  categoria: string;
  competencia: string;
  rama: Rama;
  equipoLocal: string;
  equipoVisitante: string;
  sede: string | null;
  estado: DesignacionEstado;
  notas: string | null;
  ctNombre: string | null;
  arbitros: { posicion: 1 | 2 | 3; refereeId: string }[];
}

function claveNatural(fecha: string | null, hora: string | null, categoria: string, local: string, visitante: string) {
  return `${fecha ?? ""}|${hora ?? ""}|${categoria}|${local}|${visitante}`;
}

export async function bulkImportDesignaciones(rows: BulkImportRow[]) {
  if (rows.length === 0) return { ok: false as const, error: "No hay filas para importar" };

  const profile = await requireProfile();
  const supabase = await createClient();

  const fechas = rows.map((r) => r.fecha).filter((f): f is string => !!f);
  const desde = fechas.length > 0 ? fechas.reduce((a, b) => (a < b ? a : b)) : null;
  const hasta = fechas.length > 0 ? fechas.reduce((a, b) => (a > b ? a : b)) : null;

  let existentesQuery = supabase
    .from("designaciones")
    .select("id, fecha, hora, categoria, equipo_local, equipo_visitante");
  if (desde) existentesQuery = existentesQuery.gte("fecha", desde);
  if (hasta) existentesQuery = existentesQuery.lte("fecha", hasta);
  const { data: existentes } = await existentesQuery;

  const idPorClave = new Map(
    (existentes ?? []).map((e) => [claveNatural(e.fecha, e.hora, e.categoria, e.equipo_local, e.equipo_visitante), e.id])
  );

  const { data: tarifasData } = await supabase.from("tarifas_categoria").select("competencia, categoria, monto_ct");
  const ctMontoPorClave = new Map((tarifasData ?? []).map((t) => [`${t.competencia}|${t.categoria}`, t.monto_ct]));

  // Ocupación por horario: qué árbitro ya está asignado a qué designación en
  // cada (fecha, hora). Arranca con lo que ya hay en la base para el rango de
  // fechas del import, y se va completando fila por fila para detectar
  // también choques entre filas del mismo pegado.
  const horarioPorDesignacion = new Map((existentes ?? []).map((e) => [e.id, `${e.fecha ?? ""}|${e.hora ?? ""}`]));
  const { data: arbitrosExistentes } = await supabase
    .from("designacion_arbitros")
    .select("designacion_id, referee_id")
    .in("designacion_id", (existentes ?? []).map((e) => e.id));
  const ocupacion = new Map<string, Map<string, string>>();
  for (const a of arbitrosExistentes ?? []) {
    const horario = horarioPorDesignacion.get(a.designacion_id);
    if (!horario || horario === "|") continue;
    if (!ocupacion.has(horario)) ocupacion.set(horario, new Map());
    ocupacion.get(horario)!.set(a.referee_id, a.designacion_id);
  }

  let inserted = 0;
  let updated = 0;
  let conflictos = 0;
  const designacionesUpsert: Database["public"]["Tables"]["designaciones"]["Insert"][] = [];
  const arbitrosUpsert: Database["public"]["Tables"]["designacion_arbitros"]["Insert"][] = [];
  const idsPorFila: string[] = [];

  for (const row of rows) {
    const clave = claveNatural(row.fecha, row.hora, row.categoria, row.equipoLocal, row.equipoVisitante);
    const existingId = idPorClave.get(clave);
    const id = existingId ?? crypto.randomUUID();
    idsPorFila.push(id);
    if (existingId) updated++;
    else inserted++;

    const ctMonto = row.ctNombre ? (ctMontoPorClave.get(`${row.competencia}|${row.categoria}`) ?? 0) : null;

    designacionesUpsert.push({
      id,
      jornada: row.jornada,
      fecha: row.fecha,
      hora: row.hora,
      categoria: row.categoria,
      competencia: row.competencia,
      rama: row.rama,
      equipo_local: row.equipoLocal,
      equipo_visitante: row.equipoVisitante,
      sede: row.sede,
      estado: row.estado,
      notas: row.notas,
      ct_nombre: row.ctNombre,
      ct_monto: ctMonto,
      created_by: profile.id,
    });

    const horario = row.fecha && row.hora ? `${row.fecha}|${row.hora}` : null;
    for (const a of row.arbitros) {
      if (horario) {
        const ocupadoPor = ocupacion.get(horario)?.get(a.refereeId);
        if (ocupadoPor && ocupadoPor !== id) {
          conflictos++;
          continue;
        }
        if (!ocupacion.has(horario)) ocupacion.set(horario, new Map());
        ocupacion.get(horario)!.set(a.refereeId, id);
      }
      arbitrosUpsert.push({ designacion_id: id, posicion: a.posicion, referee_id: a.refereeId, monto: 0 });
    }
  }

  const { error: desError } = await supabase.from("designaciones").upsert(designacionesUpsert);
  if (desError) return { ok: false as const, error: "No se pudieron guardar las designaciones" };

  if (arbitrosUpsert.length > 0) {
    const { error: arbError } = await supabase.from("designacion_arbitros").upsert(arbitrosUpsert);
    if (arbError) return { ok: false as const, error: "No se pudieron asignar los árbitros" };
  }

  await supabase.rpc("recalcular_montos_designaciones");

  revalidatePath("/designaciones");
  return { ok: true as const, inserted, updated, conflictos };
}
