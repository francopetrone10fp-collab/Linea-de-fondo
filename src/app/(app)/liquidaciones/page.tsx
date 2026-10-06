import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { fetchDesignaciones } from "../designaciones/queries";
import { fetchLiquidacionesManuales } from "./queries";
import LiquidacionesView from "./LiquidacionesView";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const desde = `${month}-01`;
  const hasta = new Date(y, m, 0).toISOString().slice(0, 10); // último día del mes
  return { desde, hasta };
}

export default async function LiquidacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; desde?: string; hasta?: string }>;
}) {
  const profile = await requireProfile();
  if (!isCoordinador(profile)) {
    return (
      <Empty
        title="Solo el Coordinador General puede ver esto"
        desc="Liquidaciones maneja montos de todos los árbitros — queda reservado a esa función."
      />
    );
  }

  const { month: monthParam, desde: desdeParam, hasta: hastaParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
  const isValidDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const customRange = isValidDate(desdeParam) && isValidDate(hastaParam) && desdeParam! <= hastaParam!;
  const { desde, hasta } = customRange ? { desde: desdeParam!, hasta: hastaParam! } : monthRange(month);

  const supabase = await createClient();
  const [designaciones, manuales, { data: referees }] = await Promise.all([
    fetchDesignaciones(supabase, { desde, hasta }),
    fetchLiquidacionesManuales(supabase, { desde, hasta }),
    supabase.from("referees").select("id, name").order("name"),
  ]);

  return (
    <LiquidacionesView
      designaciones={designaciones}
      manuales={manuales}
      referees={referees ?? []}
      month={month}
      desde={desde}
      hasta={hasta}
      customRange={customRange}
    />
  );
}
