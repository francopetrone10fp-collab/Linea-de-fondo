import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { fetchDesignaciones, fetchTarifas, fetchViaticos } from "./queries";
import DesignacionesView from "./DesignacionesView";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const desde = `${month}-01`;
  const hasta = new Date(y, m, 0).toISOString().slice(0, 10); // último día del mes
  return { desde, hasta };
}

export default async function DesignacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireProfile();
  const canManage = isCoordinador(profile);
  if (!canManage && !profile.referee_id) redirect("/competitions");

  const { month: monthParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
  const { desde, hasta } = monthRange(month);

  const supabase = await createClient();
  const [designaciones, tarifas, viaticos, { data: referees }] = await Promise.all([
    fetchDesignaciones(supabase, { desde, hasta }),
    fetchTarifas(supabase),
    fetchViaticos(supabase),
    supabase.from("referees").select("id, name").order("name"),
  ]);

  return (
    <DesignacionesView
      designaciones={designaciones}
      tarifas={tarifas}
      viaticos={viaticos}
      referees={referees ?? []}
      canManage={canManage}
      myRefereeId={profile.referee_id}
      month={month}
    />
  );
}
