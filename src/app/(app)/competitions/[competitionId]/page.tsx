import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro, canEvaluate } from "@/lib/session";
import { fetchPartidosFull } from "@/app/(app)/partidos/queries";
import { competitionSlugFor } from "@/app/(app)/partidos/partidoHelpers";
import CompetitionSeasonsView from "./CompetitionSeasonsView";

const SIN_COMPETENCIA = "sin-competencia";

export default async function CompetitionSeasonsPage({ params }: { params: Promise<{ competitionId: string }> }) {
  const { competitionId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [allPartidos, competitionRow, { data: seasonRows }] = await Promise.all([
    fetchPartidosFull(supabase),
    competitionId === SIN_COMPETENCIA
      ? Promise.resolve(null)
      : supabase
          .from("competitions")
          .select("id, name")
          .eq("id", competitionId)
          .single()
          .then((r) => r.data),
    competitionId === SIN_COMPETENCIA
      ? Promise.resolve({ data: [] as { name: string }[] })
      : supabase.from("seasons").select("name").eq("competition_id", competitionId),
  ]);

  if (competitionId !== SIN_COMPETENCIA && !competitionRow) notFound();

  const partidos = allPartidos.filter((p) => competitionSlugFor(p) === competitionId);
  const competitionName = competitionId === SIN_COMPETENCIA ? "Sin competencia" : competitionRow!.name;

  const counts: Record<string, number> = {};
  partidos.forEach((p) => {
    counts[p.temporada] = (counts[p.temporada] ?? 0) + 1;
  });
  // Las temporadas ya creadas explícitamente (aunque todavía no tengan
  // partidos) se suman a las que ya tienen partidos cargados, para que una
  // temporada vacía no desaparezca del listado.
  const seasonNames = new Set(Object.keys(counts));
  (seasonRows ?? []).forEach((s) => seasonNames.add(s.name));
  const seasons = Array.from(seasonNames).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const title = isArbitro(profile) ? "Mis partidos" : competitionName;

  return (
    <div>
      <Link href="/competitions" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a competencias
      </Link>

      <CompetitionSeasonsView
        competitionId={competitionId}
        title={title}
        seasons={seasons}
        counts={counts}
        canCreate={competitionId !== SIN_COMPETENCIA && canEvaluate(profile)}
      />
    </div>
  );
}
