import { createClient } from "@/lib/supabase/server";
import { requireProfile, canDelete, isCoordinador } from "@/lib/session";
import CompetitionsView from "./CompetitionsView";

export default async function CompetitionsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: competitions }, { data: partidos }] = await Promise.all([
    supabase.from("competitions").select("id, name, color").order("name"),
    supabase.from("partidos").select("competition_id"),
  ]);

  const counts: Record<string, number> = {};
  let sinCompetenciaCount = 0;
  (partidos ?? []).forEach((p) => {
    if (p.competition_id) counts[p.competition_id] = (counts[p.competition_id] ?? 0) + 1;
    else sinCompetenciaCount++;
  });

  return (
    <CompetitionsView
      competitions={competitions ?? []}
      counts={counts}
      sinCompetenciaCount={sinCompetenciaCount}
      canDeleteCompetitions={canDelete(profile)}
      canCreateCompetitions={isCoordinador(profile)}
    />
  );
}
