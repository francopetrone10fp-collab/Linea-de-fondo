import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate, canDelete, isCoordinador } from "@/lib/session";
import {
  fetchPartidosFull,
  fetchClipsForPartido,
  fetchComments,
  fetchCommentsForClips,
  fetchReadsForPartido,
  fetchClipViewedIds,
} from "@/app/(app)/partidos/queries";
import PartidoDetailView from "./PartidoDetailView";

export default async function PartidoDetailPage({
  params,
}: {
  params: Promise<{ temporada: string; competitionId: string; id: string }>;
}) {
  const { temporada, id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const partidos = await fetchPartidosFull(supabase);
  const partido = partidos.find((p) => p.id === id);
  if (!partido) notFound();

  const clips = await fetchClipsForPartido(supabase, id);

  const [comments, clipComments, reads, { data: teams }, { data: referees }, { data: categories }, { data: competitions }, viewedClipIds] =
    await Promise.all([
      fetchComments(supabase, "partido", id),
      fetchCommentsForClips(
        supabase,
        clips.map((c) => c.id)
      ),
      fetchReadsForPartido(supabase, id),
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("referees").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("competitions").select("id, name").order("name"),
      profile.referee_id && partido.referees.some((r) => r.id === profile.referee_id)
        ? fetchClipViewedIds(
            supabase,
            profile.referee_id,
            clips.map((c) => c.id)
          )
        : Promise.resolve([] as string[]),
    ]);

  const commentsByClip: Record<string, typeof clipComments> = {};
  clipComments.forEach((c) => {
    (commentsByClip[c.entityId] ??= []).push(c);
  });

  return (
    <PartidoDetailView
      partido={partido}
      clips={clips}
      comments={comments}
      commentsByClip={commentsByClip}
      reads={reads}
      teams={teams ?? []}
      referees={referees ?? []}
      categories={categories ?? []}
      competitions={competitions ?? []}
      temporada={decodeURIComponent(temporada)}
      canEvaluate={canEvaluate(profile)}
      canDelete={canDelete(profile)}
      myRefereeId={profile.referee_id}
      initialViewedClipIds={viewedClipIds}
      canCreateCompetitions={isCoordinador(profile)}
    />
  );
}
