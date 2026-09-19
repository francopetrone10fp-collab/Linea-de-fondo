import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Rama, DesignacionEstado, TarifaModo } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export interface TarifaCategoria {
  competencia: string;
  categoria: string;
  modo: TarifaModo;
  montoArbitro: number;
  montoCt: number;
}

export interface ViaticoLocalidad {
  localidad: string;
  monto: number;
}

export interface DesignacionArbitroFull {
  posicion: number;
  refereeId: string;
  refereeName: string;
  monto: number;
  // Todavía no lo confirmó el coordinador: no le aparece al árbitro en su
  // perfil ni le llegó la notificación (ver setDesignacionArbitro/confirmarArbitro).
  publicado: boolean;
}

export interface DesignacionFull {
  id: string;
  jornada: string | null;
  fecha: string | null;
  hora: string | null;
  categoria: string;
  competencia: string | null;
  rama: Rama | null;
  equipoLocal: string;
  equipoVisitante: string;
  sede: string | null;
  localidad: string | null;
  estado: DesignacionEstado;
  notas: string | null;
  ctNombre: string | null;
  ctMonto: number | null;
  requiereConfirmacion: boolean;
  arbitros: DesignacionArbitroFull[];
}

export async function fetchTarifas(supabase: DB): Promise<TarifaCategoria[]> {
  const { data } = await supabase.from("tarifas_categoria").select("*").order("competencia").order("categoria");
  return (data ?? []).map((t) => ({
    competencia: t.competencia,
    categoria: t.categoria,
    modo: t.modo,
    montoArbitro: t.monto_arbitro,
    montoCt: t.monto_ct,
  }));
}

export async function fetchViaticos(supabase: DB): Promise<ViaticoLocalidad[]> {
  const { data } = await supabase.from("viaticos_localidad").select("*").order("localidad");
  return (data ?? []).map((v) => ({ localidad: v.localidad, monto: v.monto }));
}

export interface Companero {
  refereeId: string;
  refereeName: string;
  posicion: number;
}

// Con quién dirigió cada partido (solo nombre y posición, nunca el monto):
// pasa por una función SECURITY DEFINER porque RLS restringe designacion_arbitros
// a la propia fila de cada árbitro.
export async function fetchCompaneros(supabase: DB, designacionIds: string[]): Promise<Record<string, Companero[]>> {
  if (designacionIds.length === 0) return {};
  const { data } = await supabase.rpc("designaciones_companeros", { p_designacion_ids: designacionIds });
  const byDesignacion: Record<string, Companero[]> = {};
  (data ?? []).forEach((c) => {
    (byDesignacion[c.designacion_id] ??= []).push({
      refereeId: c.referee_id,
      refereeName: c.referee_name,
      posicion: c.posicion,
    });
  });
  Object.values(byDesignacion).forEach((list) => list.sort((a, b) => a.posicion - b.posicion));
  return byDesignacion;
}

// Trae las designaciones de un rango de fechas, con sus árbitros asignados.
// Ojo: para un perfil árbitro, RLS ya filtra designacion_arbitros a sus
// propias filas (no ve el monto de sus colegas), así que este mismo fetch
// sirve tanto para la grilla del coordinador (ve todo) como para "Mis
// designaciones" de un árbitro (solo le vuelven sus propias filas).
export async function fetchDesignaciones(supabase: DB, range: { desde: string; hasta: string }): Promise<DesignacionFull[]> {
  const { data: rows } = await supabase
    .from("designaciones")
    .select("*")
    .gte("fecha", range.desde)
    .lte("fecha", range.hasta)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });

  const ids = (rows ?? []).map((r) => r.id);
  const [{ data: arbRows }, { data: referees }] = await Promise.all([
    ids.length > 0
      ? supabase.from("designacion_arbitros").select("*").in("designacion_id", ids)
      : Promise.resolve({ data: [] as Database["public"]["Tables"]["designacion_arbitros"]["Row"][] }),
    supabase.from("referees").select("id, name"),
  ]);
  const refereeNameById = new Map((referees ?? []).map((r) => [r.id, r.name]));
  const arbByDesignacion = new Map<string, DesignacionArbitroFull[]>();
  (arbRows ?? []).forEach((a) => {
    const list = arbByDesignacion.get(a.designacion_id) ?? [];
    list.push({
      posicion: a.posicion,
      refereeId: a.referee_id,
      refereeName: refereeNameById.get(a.referee_id) ?? "—",
      monto: a.monto,
      publicado: a.publicado,
    });
    arbByDesignacion.set(a.designacion_id, list);
  });

  return (rows ?? []).map((r) => ({
    id: r.id,
    jornada: r.jornada,
    fecha: r.fecha,
    hora: r.hora,
    categoria: r.categoria,
    competencia: r.competencia,
    rama: r.rama,
    equipoLocal: r.equipo_local,
    equipoVisitante: r.equipo_visitante,
    sede: r.sede,
    localidad: r.localidad,
    estado: r.estado,
    notas: r.notas,
    ctNombre: r.ct_nombre,
    ctMonto: r.ct_monto,
    requiereConfirmacion: r.requiere_confirmacion,
    arbitros: (arbByDesignacion.get(r.id) ?? []).sort((a, b) => a.posicion - b.posicion),
  }));
}

export interface Confirmacion {
  refereeId: string;
  confirmedAt: string;
}

export interface ConfirmacionEvento {
  designacionId: string;
  refereeId: string;
  refereeName: string;
  confirmedAt: string;
  equipoLocal: string;
  equipoVisitante: string;
  fecha: string | null;
  hora: string | null;
}

// Feed de "Fulano confirmó su partido" para la campana de notificaciones de
// la grilla (solo coordinador/instructor la ven). RLS de
// designacion_confirmaciones ya deja a is_coordinador() ver todas las filas,
// no solo las de designaciones donde participa.
export async function fetchConfirmacionesRecientes(supabase: DB, limit = 20): Promise<ConfirmacionEvento[]> {
  const { data: confirmaciones } = await supabase
    .from("designacion_confirmaciones")
    .select("designacion_id, referee_id, confirmed_at")
    .order("confirmed_at", { ascending: false })
    .limit(limit);
  if (!confirmaciones || confirmaciones.length === 0) return [];

  const designacionIds = Array.from(new Set(confirmaciones.map((c) => c.designacion_id)));
  const refereeIds = Array.from(new Set(confirmaciones.map((c) => c.referee_id)));
  const [{ data: designaciones }, { data: referees }] = await Promise.all([
    supabase.from("designaciones").select("id, equipo_local, equipo_visitante, fecha, hora").in("id", designacionIds),
    supabase.from("referees").select("id, name").in("id", refereeIds),
  ]);
  const designacionById = new Map((designaciones ?? []).map((d) => [d.id, d]));
  const refereeNameById = new Map((referees ?? []).map((r) => [r.id, r.name]));

  return confirmaciones
    .map((c) => {
      const d = designacionById.get(c.designacion_id);
      if (!d) return null;
      return {
        designacionId: c.designacion_id,
        refereeId: c.referee_id,
        refereeName: refereeNameById.get(c.referee_id) ?? "—",
        confirmedAt: c.confirmed_at,
        equipoLocal: d.equipo_local,
        equipoVisitante: d.equipo_visitante,
        fecha: d.fecha,
        hora: d.hora,
      };
    })
    .filter((x): x is ConfirmacionEvento => x !== null);
}

// Quién confirmó cada designación. RLS ya deja ver esto a cualquier árbitro
// asignado a esa designación (no es sensible como el monto), así que es un
// select directo, sin necesidad de una función SECURITY DEFINER.
export async function fetchConfirmaciones(supabase: DB, designacionIds: string[]): Promise<Record<string, Confirmacion[]>> {
  if (designacionIds.length === 0) return {};
  const { data } = await supabase.from("designacion_confirmaciones").select("*").in("designacion_id", designacionIds);
  const byDesignacion: Record<string, Confirmacion[]> = {};
  (data ?? []).forEach((c) => {
    (byDesignacion[c.designacion_id] ??= []).push({ refereeId: c.referee_id, confirmedAt: c.confirmed_at });
  });
  return byDesignacion;
}
