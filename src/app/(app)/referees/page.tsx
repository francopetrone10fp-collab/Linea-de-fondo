import { createClient } from "@/lib/supabase/server";
import { requireProfile, canDelete, canEvaluate } from "@/lib/session";
import RefereesView from "./RefereesView";

export default async function RefereesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: referees }, { data: clips }] = await Promise.all([
    supabase.from("referees").select("id, name, color, photo_url").order("name"),
    supabase.from("clips").select("referee_id"),
  ]);

  const counts: Record<string, number> = {};
  (clips ?? []).forEach((c) => {
    if (c.referee_id) counts[c.referee_id] = (counts[c.referee_id] ?? 0) + 1;
  });

  return (
    <RefereesView
      referees={referees ?? []}
      counts={counts}
      canDeleteReferees={canDelete(profile)}
      canManage={canEvaluate(profile)}
      myProfileId={profile.id}
      myRefereeId={profile.referee_id}
    />
  );
}
