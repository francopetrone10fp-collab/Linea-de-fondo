import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro, canEvaluate } from "@/lib/session";
import { fetchPartidosFull, fetchAllClipsMinimal, fetchAllReadsMinimal } from "../../queries";
import { competitionSlugFor } from "../../PartidoCard";
import TemporadaListView from "../TemporadaListView";

const SIN_COMPETENCIA = "sin-competencia";

export default async function CompetitionPartidosPage({
  params,
}: {
  params: Promise<{ temporada: string; competitionId: string }>;
}) {
  const { temporada, competitionId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [allPartidos, clips, reads, { data: teams }, { data: referees }, { data: competitions }] = await Promise.all([
    fetchPartidosFull(supabase),
    fetchAllClipsMinimal(supabase),
    fetchAllReadsMinimal(supabase),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("referees").select("id, name").order("name"),
    supabase.from("competitions").select("id, name").order("name"),
  ]);

  const temporadaDecoded = decodeURIComponent(temporada);
  const partidos = allPartidos.filter(
    (p) => p.temporada === temporadaDecoded && competitionSlugFor(p) === competitionId
  );
  const competitionName =
    competitionId === SIN_COMPETENCIA
      ? "Sin competencia"
      : (competitions ?? []).find((c) => c.id === competitionId)?.name;

  const clipsByPartido: Record<string, typeof clips> = {};
  clips.forEach((c) => {
    (clipsByPartido[c.partido_id] ??= []).push(c);
  });

  const readRefereeIdsByPartido: Record<string, string[]> = {};
  reads.forEach((r) => {
    (readRefereeIdsByPartido[r.partido_id] ??= []).push(r.referee_id);
  });

  return (
    <div>
      <Link
        href={`/partidos/${encodeURIComponent(temporadaDecoded)}`}
        className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a competencias
      </Link>

      <TemporadaListView
        temporada={temporadaDecoded}
        partidos={partidos}
        clipsByPartido={clipsByPartido}
        readRefereeIdsByPartido={readRefereeIdsByPartido}
        teams={teams ?? []}
        referees={referees ?? []}
        competitions={competitions ?? []}
        defaultCompetitionId={competitionId === SIN_COMPETENCIA ? undefined : competitionId}
        title={
          isArbitro(profile)
            ? "Mis partidos"
            : `${competitionName ?? "Sin competencia"} — Temporada ${temporadaDecoded}`
        }
        canCreate={canEvaluate(profile)}
        canFilterByReferee={!isArbitro(profile)}
        showReadStatus={canEvaluate(profile)}
      />
    </div>
  );
}
