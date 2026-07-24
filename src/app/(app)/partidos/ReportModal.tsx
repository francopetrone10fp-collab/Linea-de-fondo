"use client";

import { DonutChart, ChartLegend } from "@/components/charts/DonutChart";
import { BarsChart } from "@/components/charts/BarsChart";
import { evalLabel } from "@/lib/constants";
import { buildReportData, pieSegments, buildStandaloneReportHtml } from "./reportData";
import { slugKey } from "@/lib/constants";
import type { PartidoFull, ClipFull, CommentFull } from "./queries";

const EVAL_PILL_CLASSES: Record<string, string> = {
  mala: "bg-bad-bg text-bad-text",
  estandar: "bg-amber-bg text-amber-text",
  buena: "bg-good-bg text-good-text",
  relevante: "bg-relevant-bg text-relevant-text",
  pending: "bg-surface-3 text-text-faint",
};

export default function ReportModal({
  p,
  clips,
  comments,
  onClose,
}: {
  p: PartidoFull;
  clips: ClipFull[];
  comments: CommentFull[];
  onClose: () => void;
}) {
  const data = buildReportData(p, clips, comments);
  const segments = pieSegments(data);

  function download() {
    const html = buildStandaloneReportHtml(data);
    const fileSlug = slugKey(`${data.matchup}-${p.fecha ?? ""}`);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-${fileSlug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[90] p-8 overflow-y-auto">
      <div className="bg-surface border border-line rounded-2xl max-w-[720px] w-full p-8 mb-10">
        <p className="font-display text-[22px] font-semibold mt-0 mb-1">Informe de evaluación</p>
        <p className="text-[13px] text-text-dim mb-4">
          {data.matchup} · {data.fechaFmt}
          {data.competition ? ` · ${data.competition}` : ""}
          <br />
          Árbitros: {data.refereesText}
        </p>

        <div className="flex gap-2.5 flex-wrap mb-5">
          <Stat n={data.total} l="Jugadas" />
          <Stat n={data.counts.mala} l="Mala" color="text-bad-text" />
          <Stat n={data.counts.estandar} l="Estándar" color="text-amber-text" />
          <Stat n={data.counts.buena} l="Buena" color="text-good-text" />
          <Stat n={data.counts.relevante} l="Relevante" color="text-relevant-text" />
          <Stat n={data.pending} l="Sin evaluar" />
        </div>

        {data.total > 0 && (
          <div className="flex gap-7 flex-wrap mb-6">
            <div className="flex-1 min-w-[220px]">
              <div className="text-[11px] text-text-faint uppercase tracking-wide mb-3">
                Distribución de evaluaciones
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <DonutChart segments={segments} />
                <div className="flex-1 min-w-[140px]">
                  <ChartLegend segments={segments} />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="text-[11px] text-text-faint uppercase tracking-wide mb-3">Jugadas por tipo</div>
              <BarsChart items={data.situationItems} />
            </div>
          </div>
        )}

        {data.whistleClassified > 0 && (
          <div className="mb-6">
            <div className="text-[11px] text-text-faint uppercase tracking-wide mb-3">
              Tipo de silbato ({data.whistleClassified} de {data.total} clips clasificados)
            </div>
            <BarsChart items={data.whistleItems} />
          </div>
        )}

        {data.rows.length === 0 ? (
          <p className="text-[13px] text-text-faint">Este partido no tiene jugadas cargadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px] mb-5">
              <thead>
                <tr>
                  {["Jugada", "Momento", "Árbitro", "Evaluación", "Silbato", "Notas"].map((h) => (
                    <th key={h} className="text-left text-text-faint font-medium text-[10.5px] uppercase tracking-wide pb-2 border-b border-line px-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 px-2 border-b border-line align-top">
                      {r.title}
                      <br />
                      <span className="text-text-faint text-[11px]">{r.situation}</span>
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top">
                      {r.quarter} · {r.clock}
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.refereeName}</td>
                    <td className="py-2 px-2 border-b border-line align-top">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${EVAL_PILL_CLASSES[r.evaluation ?? "pending"]}`}>
                        {r.evaluation ? evalLabel(r.evaluation) : "Sin evaluar"}
                      </span>
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.whistleLabel ?? "—"}</td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.comments.length > 0 && (
          <div className="text-[11.5px] text-text-faint border-t border-dashed border-line pt-3.5 mt-2.5">
            <b className="text-text-dim">Comentarios generales del partido</b>
            <div className="mt-2">
              {data.comments.map((cm) => (
                <p key={cm.id} className="mb-2">
                  <b>{cm.authorName}</b>: {cm.text}
                </p>
              ))}
            </div>
          </div>
        )}
        {data.finalizedByName && (
          <div className="text-[11.5px] text-text-faint border-t border-dashed border-line pt-3.5 mt-2.5">
            Evaluación finalizada por <b className="text-text-dim">{data.finalizedByName}</b>
            {data.finalizedAt && ` el ${new Date(data.finalizedAt).toLocaleDateString("es-AR")}`}.
          </div>
        )}

        <div className="flex justify-end gap-2.5 mt-5">
          <button onClick={onClose} className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2">
            Cerrar
          </button>
          <button
            onClick={download}
            className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            Descargar informe (HTML)
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <div className="flex-1 min-w-[100px] bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-center">
      <div className={`font-mono text-xl ${color ?? ""}`}>{n}</div>
      <div className="text-[10.5px] text-text-faint uppercase tracking-wide mt-0.5">{l}</div>
    </div>
  );
}
