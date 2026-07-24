import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro } from "@/lib/session";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { DonutChart, ChartLegend } from "@/components/charts/DonutChart";
import { BarsChart } from "@/components/charts/BarsChart";
import { EVAL_LEVELS, EVAL_COLORS, WHISTLE_TYPES } from "@/lib/constants";
import { StatCard } from "@/components/StatCard";
import type { Evaluation } from "@/lib/database.types";

export default async function StatsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: clips }, { data: referees }] = await Promise.all([
    supabase.from("clips").select("situation, evaluation, referee_id, whistle_type"),
    supabase.from("referees").select("id, name"),
  ]);
  const refNameById = new Map((referees ?? []).map((r) => [r.id, r.name]));

  const title = isArbitro(profile) ? "Mis estadísticas" : "Estadísticas";
  const scoped = clips ?? [];

  if (scoped.length === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold mb-5">{title}</h1>
        <Empty
          title="Todavía no hay datos"
          desc={
            isArbitro(profile)
              ? "Cuando tengas clips cargados a tu nombre, vas a ver tus estadísticas acá."
              : "Cargá clips en la biblioteca para ver estadísticas del equipo."
          }
        />
      </div>
    );
  }

  const total = scoped.length;
  const counts: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };
  scoped.forEach((c) => {
    if (c.evaluation) counts[c.evaluation]++;
  });
  const pending = total - (counts.mala + counts.estandar + counts.buena + counts.relevante);

  const bySituation: Record<string, number> = {};
  scoped.forEach((c) => {
    bySituation[c.situation] = (bySituation[c.situation] ?? 0) + 1;
  });
  const situationItems = Object.entries(bySituation)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const byWhistle: Record<string, number> = {};
  scoped.forEach((c) => {
    if (c.whistle_type) byWhistle[c.whistle_type] = (byWhistle[c.whistle_type] ?? 0) + 1;
  });
  const whistleItems = WHISTLE_TYPES.map((w) => ({
    label: `${w.label} — ${w.fullName}`,
    count: byWhistle[w.key] ?? 0,
  }));
  const whistleClassified = WHISTLE_TYPES.reduce((sum, w) => sum + (byWhistle[w.key] ?? 0), 0);

  const segments = [
    { label: "Mala", value: counts.mala, color: EVAL_COLORS.mala },
    { label: "Estándar", value: counts.estandar, color: EVAL_COLORS.estandar },
    { label: "Buena", value: counts.buena, color: EVAL_COLORS.buena },
    { label: "Relevante", value: counts.relevante, color: EVAL_COLORS.relevante },
    { label: "Sin evaluar", value: pending, color: EVAL_COLORS.pending },
  ];

  let refTable: React.ReactNode = null;
  if (!isArbitro(profile)) {
    const byRef: Record<string, { count: number; evaluated: number; positive: number }> = {};
    scoped.forEach((c) => {
      const name = c.referee_id ? (refNameById.get(c.referee_id) ?? "Sin especificar") : "Sin especificar";
      byRef[name] ??= { count: 0, evaluated: 0, positive: 0 };
      byRef[name].count++;
      if (c.evaluation) {
        byRef[name].evaluated++;
        if (c.evaluation === "buena" || c.evaluation === "relevante") byRef[name].positive++;
      }
    });
    const rows = Object.entries(byRef)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
    refTable = (
      <>
        <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
          Por árbitro
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {["Árbitro", "Clips", "Evaluados", "% buena/relevante"].map((h) => (
                  <th key={h} className="text-left text-text-faint font-medium text-[11.5px] uppercase tracking-wide px-2.5 pb-2 border-b border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, d]) => (
                <tr key={name}>
                  <td className="px-2.5 py-2.5 border-b border-line">{name}</td>
                  <td className="px-2.5 py-2.5 border-b border-line">{d.count}</td>
                  <td className="px-2.5 py-2.5 border-b border-line">{d.evaluated}</td>
                  <td className="px-2.5 py-2.5 border-b border-line">
                    {d.evaluated ? `${Math.round((d.positive / d.evaluated) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-5">{title}</h1>

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard label="Clips totales" value={total} />
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
          <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
            Clips por tipo de jugada
          </div>
          <BarsChart items={situationItems} />
        </div>
      </div>

      <div className="mb-8">
        <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-1">
          Por tipo de silbato
        </div>
        <p className="text-[11.5px] text-text-faint mb-3.5">
          Impulsividad y velocidad de procesamiento en la decisión ({whistleClassified} de {total} clips clasificados).
        </p>
        <BarsChart items={whistleItems} />
      </div>

      {refTable}

      <div className="mt-6">
        <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
          Barras por nivel (referencia)
        </div>
        {EVAL_LEVELS.map((l) => (
          <BarRow key={l.key} label={l.label} count={counts[l.key]} max={Math.max(counts.mala, counts.estandar, counts.buena, counts.relevante, 1)} />
        ))}
      </div>
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className="w-[150px] flex-none text-[13px] text-text-dim">{label}</div>
      <div className="flex-1 bg-surface-2 rounded-[5px] h-4 overflow-hidden">
        <div className="h-full bg-accent rounded-[5px]" style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <div className="w-7 text-right font-mono text-[12.5px] text-text-dim">{count}</div>
    </div>
  );
}
