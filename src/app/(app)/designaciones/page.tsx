import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import {
  fetchDesignaciones,
  fetchTarifas,
  fetchViaticos,
  fetchCompaneros,
  fetchConfirmaciones,
  fetchConfirmacionesRecientes,
  fetchPartidosExternos,
} from "./queries";
import { fetchDisponibilidad, fetchClubExclusiones } from "../disponibilidad/queries";
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
  searchParams: Promise<{ month?: string; desde?: string; hasta?: string }>;
}) {
  const profile = await requireProfile();
  const canManage = isCoordinador(profile);
  if (!canManage && !profile.referee_id) redirect("/competitions");

  const { month: monthParam, desde: desdeParam, hasta: hastaParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
  const isValidDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  // Además de navegar mes a mes, se puede pisar el rango con "desde"/"hasta"
  // en la URL (para exportar un período que no coincide con un mes calendario).
  const customRange = isValidDate(desdeParam) && isValidDate(hastaParam) && desdeParam! <= hastaParam!;
  const { desde, hasta } = customRange ? { desde: desdeParam!, hasta: hastaParam! } : monthRange(month);

  const supabase = await createClient();
  const designaciones = await fetchDesignaciones(supabase, { desde, hasta });
  const [
    tarifas,
    viaticos,
    companeros,
    confirmaciones,
    disponibilidadPorArbitro,
    { data: referees },
    { data: teams },
    confirmacionesRecientes,
    { data: profileRow },
    exclusionesPorArbitro,
    partidosExternos,
  ] = await Promise.all([
    fetchTarifas(supabase),
    fetchViaticos(supabase),
    fetchCompaneros(
      supabase,
      designaciones.map((d) => d.id)
    ),
    fetchConfirmaciones(
      supabase,
      designaciones.map((d) => d.id)
    ),
    fetchDisponibilidad(supabase, { desde, hasta }),
    supabase.from("referees").select("id, name").order("name"),
    supabase.from("teams").select("id, name, color, photo_url").order("name"),
    canManage ? fetchConfirmacionesRecientes(supabase) : Promise.resolve([]),
    canManage
      ? supabase.from("profiles").select("designaciones_bell_seen_at").eq("id", profile.id).single()
      : Promise.resolve({ data: null }),
    canManage ? fetchClubExclusiones(supabase) : Promise.resolve({}),
    profile.referee_id ? fetchPartidosExternos(supabase, { desde, hasta }) : Promise.resolve([]),
  ]);

  return (
    <DesignacionesView
      designaciones={designaciones}
      tarifas={tarifas}
      viaticos={viaticos}
      companeros={companeros}
      confirmaciones={confirmaciones}
      disponibilidadPorArbitro={disponibilidadPorArbitro}
      referees={referees ?? []}
      teams={teams ?? []}
      canManage={canManage}
      myRefereeId={profile.referee_id}
      month={month}
      desde={desde}
      hasta={hasta}
      customRange={customRange}
      confirmacionesRecientes={confirmacionesRecientes}
      bellSeenAt={profileRow?.designaciones_bell_seen_at ?? null}
      exclusionesPorArbitro={exclusionesPorArbitro}
      partidosExternos={partidosExternos}
    />
  );
}
