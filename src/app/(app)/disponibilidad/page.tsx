import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { fetchDisponibilidad, fetchClubExclusiones } from "./queries";
import { mondayOf } from "@/lib/weekUtils";
import DisponibilidadView from "./DisponibilidadView";

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const profile = await requireProfile();
  const canManage = isCoordinador(profile);
  if (!canManage && !profile.referee_id) redirect("/competitions");

  const { semana: semanaParam } = await searchParams;
  const monday =
    semanaParam && /^\d{4}-\d{2}-\d{2}$/.test(semanaParam)
      ? mondayOf(semanaParam)
      : mondayOf(new Date().toISOString().slice(0, 10));

  const desde = monday;
  const hastaDate = new Date(monday + "T12:00:00");
  hastaDate.setDate(hastaDate.getDate() + 6);
  const hasta = hastaDate.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [disponibilidadPorArbitro, { data: referees }, { data: teams }, exclusionesPorArbitro] = await Promise.all([
    fetchDisponibilidad(supabase, { desde, hasta }),
    supabase.from("referees").select("id, name").order("name"),
    supabase.from("teams").select("id, name, color, photo_url").order("name"),
    fetchClubExclusiones(supabase),
  ]);

  return (
    <DisponibilidadView
      monday={monday}
      disponibilidadPorArbitro={disponibilidadPorArbitro}
      referees={referees ?? []}
      canManage={canManage}
      myRefereeId={profile.referee_id}
      teams={teams ?? []}
      exclusionesPorArbitro={exclusionesPorArbitro}
    />
  );
}
