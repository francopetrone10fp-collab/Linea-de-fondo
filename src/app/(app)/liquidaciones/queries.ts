import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type DB = SupabaseClient<Database>;

export interface LiquidacionManual {
  id: string;
  refereeId: string;
  refereeName: string;
  fecha: string;
  concepto: string;
  monto: number;
  createdAt: string;
}

export async function fetchLiquidacionesManuales(
  supabase: DB,
  range: { desde: string; hasta: string }
): Promise<LiquidacionManual[]> {
  const [{ data: rows }, { data: referees }] = await Promise.all([
    supabase
      .from("liquidaciones_manuales")
      .select("*")
      .gte("fecha", range.desde)
      .lte("fecha", range.hasta)
      .order("fecha", { ascending: false }),
    supabase.from("referees").select("id, name"),
  ]);
  const refereeNameById = new Map((referees ?? []).map((r) => [r.id, r.name]));
  return (rows ?? []).map((r) => ({
    id: r.id,
    refereeId: r.referee_id,
    refereeName: refereeNameById.get(r.referee_id) ?? "—",
    fecha: r.fecha,
    concepto: r.concepto,
    monto: r.monto,
    createdAt: r.created_at,
  }));
}
