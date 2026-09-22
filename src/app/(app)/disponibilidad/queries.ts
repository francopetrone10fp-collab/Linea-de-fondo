import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export interface DisponibilidadDia {
  fecha: string;
  disponible: boolean;
  categorias: string[];
}

// Disponibilidad de un rango de fechas. RLS ya se encarga de que un árbitro
// solo vea sus propias filas y el coordinador/designador vea todas, así que
// este mismo fetch sirve tanto para "Mi disponibilidad" como para la matriz.
export async function fetchDisponibilidad(
  supabase: DB,
  range: { desde: string; hasta: string }
): Promise<Record<string, DisponibilidadDia[]>> {
  const { data } = await supabase
    .from("disponibilidades")
    .select("referee_id, fecha, disponible, categorias")
    .gte("fecha", range.desde)
    .lte("fecha", range.hasta);

  const byReferee: Record<string, DisponibilidadDia[]> = {};
  (data ?? []).forEach((row) => {
    (byReferee[row.referee_id] ??= []).push({
      fecha: row.fecha,
      disponible: row.disponible,
      categorias: row.categorias,
    });
  });
  return byReferee;
}

// Clubes que cada árbitro marcó que no puede dirigir (preferencia estable,
// no atada a una fecha). RLS ya limita esto a "todas" para coordinador y
// "las propias" para el resto, así que este mismo fetch sirve para la
// grilla de designaciones y para "Mi disponibilidad".
export async function fetchClubExclusiones(supabase: DB): Promise<Record<string, string[]>> {
  const { data } = await supabase.from("referee_club_exclusions").select("referee_id, team_id");
  const byReferee: Record<string, string[]> = {};
  (data ?? []).forEach((row) => {
    (byReferee[row.referee_id] ??= []).push(row.team_id);
  });
  return byReferee;
}
