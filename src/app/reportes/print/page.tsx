import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import { fetchAllClipsFull } from "@/app/(app)/reportes/queries";
import { applyReportFilters, searchParamsToFilters } from "@/app/(app)/reportes/filters";
import { buildAggregateStats } from "@/app/(app)/reportes/aggregate";
import { StatCard } from "@/components/StatCard";
import { DonutChart, ChartLegend } from "@/components/charts/DonutChart";
import { BarsChart } from "@/components/charts/BarsChart";
import { evalLabel, whistleTypeInfo } from "@/lib/constants";
import AutoPrint from "./AutoPrint";
import PrintButton from "./PrintButton";

const EVAL_PILL_CLASSES: Record<string, string> = {
  mala: "bg-bad-bg text-bad-text",
  estandar: "bg-amber-bg text-amber-text",
  buena: "bg-good-bg text-good-text",
  relevante: "bg-relevant-bg text-relevant-text",
  pending: "bg-surface-3 text-text-faint",
};

function fechaFmt(fecha: string | null) {
  return fecha
    ? new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Sin fecha";
}

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  if (!canEvaluate(profile)) redirect("/competitions");

  const filters = searchParamsToFilters(await searchParams);

  const supabase = await createClient();
  const clips = await fetchAllClipsFull(supabase);
  const rows = [...applyReportFilters(clips, filters)].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  const stats = buildAggregateStats(rows);
  const generatedAt = new Date().toLocaleString("es-AR");

  return (
    <div className="bg-bg text-text min-h-screen p-8">
      <AutoPrint />

      <div className="print:hidden flex justify-between items-center mb-6 max-w-[900px] mx-auto">
        <Link href="/reportes" className="text-text-dim hover:text-text text-[13px]">
          ← Volver a Reportes
        </Link>
        <PrintButton />
      </div>

      <div className="max-w-[900px] mx-auto">
        <p className="font-display text-[22px] font-semibold mt-0 mb-1">Informe de Reportes — Línea de Fondo</p>
        <p className="text-[13px] text-text-dim mb-6">
          Generado el {generatedAt} · {rows.length} jugada{rows.length === 1 ? "" : "s"}
        </p>

        <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <StatCard label="Jugadas" value={stats.total} />
          <StatCard label="Mala" value={stats.counts.mala} colorClass="text-bad-text" />
          <StatCard label="Estándar" value={stats.counts.estandar} colorClass="text-amber-text" />
          <StatCard label="Buena" value={stats.counts.buena} colorClass="text-good-text" />
          <StatCard label="Relevante" value={stats.counts.relevante} colorClass="text-relevant-text" />
          <StatCard label="Sin evaluar" value={stats.pending} />
        </div>

        {stats.total > 0 && (
          <div className="flex gap-7 flex-wrap mb-6">
            <div className="flex-1 min-w-[220px]">
              <div className="text-[11px] text-text-faint uppercase tracking-wide mb-3">
                Distribución de evaluaciones
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <DonutChart segments={stats.segments} />
                <div className="flex-1 min-w-[140px]">
                  <ChartLegend segments={stats.segments} />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="text-[11px] text-text-faint uppercase tracking-wide mb-3">Jugadas por tipo</div>
              <BarsChart items={stats.situationItems} />
            </div>
          </div>
        )}

        {stats.whistleClassified > 0 && (
          <div className="mb-6">
            <div className="text-[11px] text-text-faint uppercase tracking-wide mb-3">
              Tipo de silbato ({stats.whistleClassified} de {stats.total} clips clasificados)
            </div>
            <BarsChart items={stats.whistleItems} />
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-[13px] text-text-faint">Ninguna jugada coincide con los filtros aplicados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px] mb-5">
              <thead>
                <tr>
                  {["Partido", "Fecha", "Árbitro", "Tipo", "Momento", "Evaluación", "Silbato"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-text-faint font-medium text-[10.5px] uppercase tracking-wide pb-2 border-b border-line px-2"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-2 border-b border-line align-top">
                      {r.teamLocal?.name ?? "?"} vs {r.teamVisit?.name ?? "?"}
                      <br />
                      <span className="text-text-faint text-[11px]">{r.title}</span>
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top whitespace-nowrap">{fechaFmt(r.fecha)}</td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.referee?.name ?? "—"}</td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.situation}</td>
                    <td className="py-2 px-2 border-b border-line align-top whitespace-nowrap">
                      {r.quarter} · {r.clock ?? "--:--"}
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top">
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          EVAL_PILL_CLASSES[r.evaluation ?? "pending"]
                        }`}
                      >
                        {r.evaluation ? evalLabel(r.evaluation) : "Sin evaluar"}
                      </span>
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top">
                      {r.whistleType ? (whistleTypeInfo(r.whistleType)?.label ?? "—") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
