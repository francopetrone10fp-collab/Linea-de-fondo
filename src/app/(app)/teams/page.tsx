import { createClient } from "@/lib/supabase/server";
import { requireProfile, canDelete, canEvaluate } from "@/lib/session";
import TeamsView from "./TeamsView";

export default async function TeamsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: teams }, { data: local }, { data: visit }] = await Promise.all([
    supabase.from("teams").select("id, name, color").order("name"),
    supabase.from("partidos").select("team_local_id"),
    supabase.from("partidos").select("team_visit_id"),
  ]);

  const counts: Record<string, number> = {};
  (local ?? []).forEach((p) => {
    if (p.team_local_id) counts[p.team_local_id] = (counts[p.team_local_id] ?? 0) + 1;
  });
  (visit ?? []).forEach((p) => {
    if (p.team_visit_id) counts[p.team_visit_id] = (counts[p.team_visit_id] ?? 0) + 1;
  });

  return (
    <TeamsView
      teams={teams ?? []}
      counts={counts}
      canDeleteTeams={canDelete(profile)}
      canManage={canEvaluate(profile)}
    />
  );
}
