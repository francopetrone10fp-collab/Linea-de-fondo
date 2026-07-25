import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import { fetchPartidosFull, fetchAllClipsMinimal } from "@/app/(app)/partidos/queries";
import { PartidoCard } from "@/app/(app)/partidos/PartidoCard";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { ColorBadge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import { DonutChart, ChartLegend } from "@/components/charts/DonutChart";
import { BarsChart } from "@/components/charts/BarsChart";
import { EVAL_COLORS, WHISTLE_TYPES } from "@/lib/constants";
import type { Evaluation } from "@/lib/database.types";

const EVAL_WEIGHT: Record<Evaluation, number> = { mala: 1, estandar: 2, buena: 3, relevante: 4 };
const EMPTY_COUNTS: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };

export default async function RefereeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!canEvaluate(profile)) redirect("/competitions");

  const supabase = await createClient();
  const [{ data: referee }, allPartidos, clipsMinimal, { data: myClipsData }] = await Promise.all([
    supabase.from("referees").select("id, name, color, photo_url").eq("id", id).single(),
    fetchPartidosFull(supabase),
    fetchAllClipsMinimal(supabase),
    supabase.from("clips").select("evaluation, whistle_type, partido_id").eq("referee_id", id),
  ]);

  if (!referee) notFound();

  const myClips = myClipsData ?? [];
  const partidoById = new Map(allPartidos.map((p) => [p.id, p]));

  const refereePartidos = allPartidos.filter((p) => p.referees.some((r) => r.id === id));
  const clipsByPartido: Record<string, typeof clipsMinimal> = {};
  clipsMinimal.forEach((c) => {
    (clipsByPartido[c.partido_id] ??= []).push(c);
  });

  const partidosBySeason: Record<string, typeof refereePartidos> = {};
  refereePartidos.forEach((p) => {
    (partidosBySeason[p.temporada] ??= []).push(p);
  });
  const seasons = Object.keys(partidosBySeason).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  function seasonAvg(season: string) {
    const evaluated = myClips.filter((c) => c.evaluation && partidoById.get(c.partido_id)?.temporada === season);
    if (evaluated.length === 0) return null;
    const sum = evaluated.reduce((s, c) => s + EVAL_WEIGHT[c.evaluation!], 0);
    return sum / evaluated.length;
  }

  const total = myClips.length;
  const counts: Record<Evaluation, number> = { ...EMPTY_COUNTS };
  myClips.forEach((c) => {
    if (c.evaluation) counts[c.evaluation]++;
  });
  const pending = total - (counts.mala + counts.estandar + counts.buena + counts.relevante);

  const segments = [
    { label: "Mala", value: counts.mala, color: EVAL_COLORS.mala },
    { label: "Estándar", value: counts.estandar, color: EVAL_COLORS.estandar },
    { label: "Buena", value: counts.buena, color: EVAL_COLORS.buena },
    { label: "Relevante", value: counts.relevante, color: EVAL_COLORS.relevante },
    { label: "Sin evaluar", value: pending, color: EVAL_COLORS.pending },
  ];

  const byWhistle: Record<string, number> = {};
  myClips.forEach((c) => {
    if (c.whistle_type) byWhistle[c.whistle_type] = (byWhistle[c.whistle_type] ?? 0) + 1;
  });
  const whistleItems = WHISTLE_TYPES.map((w) => ({
    label: `${w.label} — ${w.fullName}`,
    count: byWhistle[w.key] ?? 0,
  }));
  const whistleClassified = WHISTLE_TYPES.reduce((sum, w) => sum + (byWhistle[w.key] ?? 0), 0);

  return (
    <div>
      <Link href="/referees" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a árbitros
      </Link>

      <div className="flex items-center gap-3.5 mb-6">
        <ColorBadge name={referee.name} color={referee.color} photoUrl={referee.photo_url} size={56} />
        <h1 className="font-display text-2xl font-semibold">{referee.name}</h1>
      </div>

      {total === 0 ? (
        <Empty title="Todavía no tiene jugadas cargadas" desc="Cuando se le asignen clips en algún partido, van a aparecer las estadísticas acá." />
      ) : (
        <>
          <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <StatCard label="Jugadas totales" value={total} />
            <StatCard label="Mala" value={counts.mala} colorClass="text-bad-text" />
            <StatCard label="Estándar" value={counts.estandar} colorClass="text-amber-text" />
            <StatCard label="Buena" value={counts.buena} colorClass="text-good-text" />
            <StatCard label="Relevante" value={counts.relevante} colorClass="text-relevant-text" />
            <StatCard label="Sin evaluar" value={pending} />
          </div>

          <div className="flex gap-8 flex-wrap mb-8">
            <div className="flex-1 min-w-[260px]">
              <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
                Por nivel de evaluación
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <DonutChart segments={segments} />
                <div className="flex-1 min-w-[140px]">
                  <ChartLegend segments={segments} />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[260px]">
              <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-1">
                Por tipo de silbato
              </div>
              <p className="text-[11.5px] text-text-faint mb-3.5">
                {whistleClassified} de {total} clips clasificados.
              </p>
              <BarsChart items={whistleItems} />
            </div>
          </div>
        </>
      )}

      <h2 className="font-display text-[19px] font-semibold mb-4">Partidos</h2>

      {seasons.length === 0 ? (
        <Empty title="Todavía no participó de ningún partido" desc="Cuando se lo asigne a un partido, va a aparecer acá agrupado por temporada." />
      ) : (
        seasons.map((season) => {
          const seasonPartidos = partidosBySeason[season];
          const avg = seasonAvg(season);
          return (
            <div key={season} className="mb-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
                <h3 className="font-display text-[17px] font-semibold">
                  {season === "Sin fecha" ? "Sin fecha" : `Temporada ${season}`}
                </h3>
                <span className="text-[12px] text-text-dim">
                  {seasonPartidos.length} partido{seasonPartidos.length === 1 ? "" : "s"}
                  {avg !== null && <> · Evaluación promedio: {avg.toFixed(1)} / 4.0</>}
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
