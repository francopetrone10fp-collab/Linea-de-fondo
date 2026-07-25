import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro } from "@/lib/session";
import { fetchPartidosFull } from "@/app/(app)/partidos/queries";
import { competitionSlugFor } from "@/app/(app)/partidos/partidoHelpers";
import { Empty } from "@/app/(app)/teams/TeamsView";

const SIN_COMPETENCIA = "sin-competencia";

export default async function CompetitionSeasonsPage({ params }: { params: Promise<{ competitionId: string }> }) {
  const { competitionId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [allPartidos, competitionRow] = await Promise.all([
    fetchPartidosFull(supabase),
    competitionId === SIN_COMPETENCIA
      ? Promise.resolve(null)
      : supabase
          .from("competitions")
          .select("id, name")
          .eq("id", competitionId)
          .single()
          .then((r) => r.data),
  ]);

  if (competitionId !== SIN_COMPETENCIA && !competitionRow) notFound();

  const partidos = allPartidos.filter((p) => competitionSlugFor(p) === competitionId);
  const competitionName = competitionId === SIN_COMPETENCIA ? "Sin competencia" : competitionRow!.name;

  const counts: Record<string, number> = {};
  partidos.forEach((p) => {
    counts[p.temporada] = (counts[p.temporada] ?? 0) + 1;
  });
  const seasons = Object.keys(counts).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const title = isArbitro(profile) ? "Mis partidos" : competitionName;

  return (
    <div>
      <Link href="/competitions" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a competencias
      </Link>

      <h1 className="font-display text-2xl font-semibold mb-5">{title}</h1>

      {seasons.length === 0 ? (
        <Empty title="No hay partidos acá" desc="Registrá el primero desde esta competencia." />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {seasons.map((season) => (
            <Link
              key={season}
              href={`/competitions/${encodeURIComponent(competitionId)}/${encodeURIComponent(season)}`}
              className="bg-surface border border-line rounded-xl p-5 flex items-center gap-3.5 hover:border-text-faint"
            >
              <span className="w-11 h-11 rounded-[10px] bg-surface-3 text-accent flex items-center justify-center flex-none">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
              </span>
              <div>
                <div className="font-display text-[17px] font-semibold">
                  {season === "Sin fecha" ? "Sin fecha" : `Temporada ${season}`}
                </div>
                <div className="text-[12px] text-text-faint mt-0.5">
                  {counts[season]} partido{counts[season] === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
