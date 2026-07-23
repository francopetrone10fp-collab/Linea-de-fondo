import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate, canDelete, isArbitro } from "@/lib/session";
import { fetchPartidosFull, fetchClipsForPartido, fetchComments, fetchReadsForPartido, fetchClipViewedIds } from "../../queries";
import PartidoDetailView from "./PartidoDetailView";

export default async function PartidoDetailPage({
  params,
}: {
  params: Promise<{ temporada: string; id: string }>;
}) {
  const { temporada, id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const partidos = await fetchPartidosFull(supabase);
  const partido = partidos.find((p) => p.id === id);
  if (!partido) notFound();

  const clips = await fetchClipsForPartido(supabase, id);

  const [comments, reads, { data: teams }, { data: referees }, viewedClipIds] = await Promise.all([
    fetchComments(supabase, "partido", id),
    fetchReadsForPartido(supabase, id),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("referees").select("id, name").order("name"),
    isArbitro(profile) && profile.referee_id
      ? fetchClipViewedIds(
          supabase,
          profile.referee_id,
          clips.map((c) => c.id)
        )
      : Promise.resolve([] as string[]),
  ]);

  return (
    <PartidoDetailView
      partido={partido}
      clips={clips}
      comments={comments}
      reads={reads}
      teams={teams ?? []}
      referees={referees ?? []}
      temporada={decodeURIComponent(temporada)}
      canEvaluate={canEvaluate(profile)}
      canDelete={canDelete(profile)}
      isArbitro={isArbitro(profile)}
      myRefereeId={profile.referee_id}
      initialViewedClipIds={viewedClipIds}
    />
  );
}
