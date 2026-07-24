import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import { fetchPartidosFull, fetchAllClipsMinimal } from "@/app/(app)/partidos/queries";
import { PartidoCard } from "@/app/(app)/partidos/PartidoCard";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { ColorBadge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import type { Evaluation } from "@/lib/database.types";

const EMPTY_COUNTS: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };

export default async function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!canEvaluate(profile)) redirect("/partidos");

  const supabase = await createClient();
  const [{ data: team }, allPartidos, clipsMinimal] = await Promise.all([
    supabase.from("teams").select("id, name, color").eq("id", id).single(),
    fetchPartidosFull(supabase),
    fetchAllClipsMinimal(supabase),
  ]);

  if (!team) notFound();

  const teamPartidos = allPartidos.filter((p) => p.teamLocal?.id === id || p.teamVisit?.id === id);
  const asLocal = teamPartidos.filter((p) => p.teamLocal?.id === id).length;
  const asVisit = teamPartidos.filter((p) => p.teamVisit?.id === id).length;

  const clipsByPartido: Record<string, typeof clipsMinimal> = {};
  clipsMinimal.forEach((c) => {
    (clipsByPartido[c.partido_id] ??= []).push(c);
  });

  const partidosBySeason: Record<string, typeof teamPartidos> = {};
  teamPartidos.forEach((p) => {
    (partidosBySeason[p.temporada] ??= []).push(p);
  });
  const seasons = Object.keys(partidosBySeason).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return (
    <div>
      <Link href="/teams" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a equipos
      </Link>

      <div className="flex items-center gap-3.5 mb-6">
        <ColorBadge name={team.name} color={team.color} size={56} />
        <h1 className="font-display text-2xl font-semibold">{team.name}</h1>
      </div>

      <div className="grid gap-3.5 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard label="Partidos jugados" value={teamPartidos.length} />
        <StatCard label="Como local" value={asLocal} />
        <StatCard label="Como visitante" value={asVisit} />
      </div>

      <h2 className="font-display text-[19px] font-semibold mb-4">Partidos</h2>

      {seasons.length === 0 ? (
        <Empty title="Todavía no jugó ningún partido" desc="Cuando se lo cargue en un partido, va a aparecer acá agrupado por temporada." />
      ) : (
        seasons.map((season) => {
          const seasonPartidos = partidosBySeason[season];
          return (
            <div key={season} className="mb-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
                <h3 className="font-display text-[17px] font-semibold">
                  {season === "Sin fecha" ? "Sin fecha" : `Temporada ${season}`}
                </h3>
                <span className="text-[12px] text-text-dim">
                  {seasonPartidos.length} partido{seasonPartidos.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {seasonPartidos.map((p) => {
                  const clips = clipsByPartido[p.id] ?? [];
                  const evalCounts = { ...EMPTY_COUNTS };
                  let partidoPending = 0;
                  clips.forEach((c) => {
                    if (c.evaluation) evalCounts[c.evaluation]++;
                    else partidoPending++;
                  });
                  return (
                    <PartidoCard
                      key={p.id}
                      p={p}
                      temporada={season}
                      evalCounts={evalCounts}
                      pendingCount={partidoPending}
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
