import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro, canEvaluate } from "@/lib/session";
import { fetchPartidosFull, fetchAllClipsMinimal } from "../queries";
import TemporadaListView from "./TemporadaListView";

export default async function TemporadaPage({ params }: { params: Promise<{ temporada: string }> }) {
  const { temporada } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [allPartidos, clips, { data: teams }, { data: referees }] = await Promise.all([
    fetchPartidosFull(supabase),
    fetchAllClipsMinimal(supabase),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("referees").select("id, name").order("name"),
  ]);

  const partidos = allPartidos.filter((p) => p.temporada === decodeURIComponent(temporada));

  const clipsByPartido: Record<string, typeof clips> = {};
  clips.forEach((c) => {
    (clipsByPartido[c.partido_id] ??= []).push(c);
  });

  return (
    <div>
      <Link href="/partidos" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a temporadas
      </Link>

      <TemporadaListView
        temporada={decodeURIComponent(temporada)}
        partidos={partidos}
        clipsByPartido={clipsByPartido}
        teams={teams ?? []}
        referees={referees ?? []}
        title={isArbitro(profile) ? "Mis partidos" : `Temporada ${decodeURIComponent(temporada)}`}
        canCreate={canEvaluate(profile)}
        canFilterByReferee={!isArbitro(profile)}
      />
    </div>
  );
}
