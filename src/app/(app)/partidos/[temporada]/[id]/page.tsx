import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate, canDelete, isArbitro } from "@/lib/session";
import { fetchPartidosFull, fetchClipsForPartido, fetchComments, fetchReadsForPartido } from "../../queries";
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

  const [clips, comments, reads, { data: teams }, { data: referees }] = await Promise.all([
    fetchClipsForPartido(supabase, id),
    fetchComments(supabase, "partido", id),
    fetchReadsForPartido(supabase, id),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("referees").select("id, name").order("name"),
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
    />
  );
}
