import { EVAL_COLORS, evalLabel, WHISTLE_TYPES, whistleTypeInfo } from "@/lib/constants";
import type { PartidoFull, ClipFull, CommentFull } from "./queries";
import type { Evaluation } from "@/lib/database.types";

export interface ReportRow {
  title: string;
  situation: string;
  quarter: string;
  clock: string;
  refereeName: string;
  evaluation: Evaluation | null;
  whistleLabel: string | null;
  notes: string;
}

export interface ReportData {
  matchup: string;
  fechaFmt: string;
  category: string | null;
  competition: string | null;
  refereesText: string;
  counts: Record<Evaluation, number>;
  pending: number;
  total: number;
  rows: ReportRow[];
  situationItems: { label: string; count: number }[];
  whistleItems: { label: string; count: number }[];
  whistleClassified: number;
  comments: CommentFull[];
  finalizedByName: string | null;
  finalizedAt: string | null;
}

export function buildReportData(p: PartidoFull, clips: ClipFull[], comments: CommentFull[]): ReportData {
  const counts: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };
  let pending = 0;
  clips.forEach((c) => {
    if (c.evaluation) counts[c.evaluation]++;
    else pending++;
  });

  const fechaFmt = p.fecha
    ? new Date(p.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Sin fecha";
  const matchup = [p.teamLocal?.name, p.teamVisit?.name].filter(Boolean).join(" vs ") || "Partido sin equipos cargados";
  const refereesText = p.referees.length ? p.referees.map((r) => r.name).join(" · ") : "Sin árbitros asignados";

  const situationCounts: Record<string, number> = {};
  clips.forEach((c) => {
    situationCounts[c.situation] = (situationCounts[c.situation] ?? 0) + 1;
  });
  const situationItems = Object.entries(situationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const whistleCounts: Record<string, number> = {};
  clips.forEach((c) => {
    if (c.whistleType) whistleCounts[c.whistleType] = (whistleCounts[c.whistleType] ?? 0) + 1;
  });
  const whistleItems = WHISTLE_TYPES.map((w) => ({
    label: `${w.label} — ${w.fullName}`,
    count: whistleCounts[w.key] ?? 0,
  }));
  const whistleClassified = WHISTLE_TYPES.reduce((sum, w) => sum + (whistleCounts[w.key] ?? 0), 0);

  return {
    matchup,
    fechaFmt,
    category: p.category?.name ?? null,
    competition: p.competition?.name ?? null,
    refereesText,
    counts,
    pending,
    total: clips.length,
    rows: clips.map((c) => ({
      title: c.title,
      situation: c.situation,
      quarter: c.quarter,
      clock: c.clock || "--:--",
      refereeName: c.referee?.name ?? "—",
      evaluation: c.evaluation,
      whistleLabel: whistleTypeInfo(c.whistleType)?.label ?? null,
      notes: c.notes ?? "",
    })),
    situationItems,
    whistleItems,
    whistleClassified,
    comments,
    finalizedByName: p.finalizedByName,
    finalizedAt: p.finalizedAt,
  };
}

export function pieSegments(data: ReportData) {
  return [
    { label: "No recomendable", value: data.counts.mala, color: EVAL_COLORS.mala },
    { label: "Estándar", value: data.counts.estandar, color: EVAL_COLORS.estandar },
    { label: "Buena", value: data.counts.buena, color: EVAL_COLORS.buena },
    { label: "Relevante", value: data.counts.relevante, color: EVAL_COLORS.relevante },
    { label: "Sin evaluar", value: data.pending, color: EVAL_COLORS.pending },
  ];
}

const STANDALONE_CSS = `
  body{background:#0B0F14;color:#EDEFF2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Barlow,sans-serif;padding:30px;margin:0;}
  .report-box{background:#131820;border:1px solid #2C3644;border-radius:14px;max-width:720px;margin:0 auto;padding:30px;}
  .report-title{font-size:22px;font-weight:700;margin:0 0 4px;}
  .report-sub{font-size:13px;color:#97A1AE;margin:0 0 18px;line-height:1.5;}
  .report-stat-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;}
  .report-stat{flex:1;min-width:100px;background:#1B222C;border:1px solid #2C3644;border-radius:9px;padding:10px 12px;text-align:center;}
  .report-stat .n{font-family:monospace;font-size:20px;font-weight:600;}
  .report-stat .l{font-size:10.5px;color:#5C6672;text-transform:uppercase;letter-spacing:0.03em;margin-top:2px;}
  .report-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:20px;}
  .report-table th{text-align:left;color:#5C6672;font-weight:500;font-size:10.5px;text-transform:uppercase;letter-spacing:0.03em;padding:0 8px 8px;border-bottom:1px solid #2C3644;}
  .report-table td{padding:8px 8px;border-bottom:1px solid #2C3644;vertical-align:top;}
  .report-eval-pill{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;}
  .report-eval-pill.mala{background:#331B1B;color:#F09595;}
  .report-eval-pill.estandar{background:#332B15;color:#E8CE85;}
  .report-eval-pill.buena{background:#1B2E1F;color:#7FCB8C;}
  .report-eval-pill.relevante{background:#0F2E28;color:#7FE0C9;}
  .report-eval-pill.pending{background:#232B37;color:#5C6672;}
  .report-foot{font-size:11.5px;color:#5C6672;border-top:1px dashed #2C3644;padding-top:14px;margin-top:10px;}
`;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildStandaloneReportHtml(data: ReportData): string {
  const rows = data.rows
    .map(
      (r) => `
    <tr>
      <td>${esc(r.title)}<br><span style="color:#5C6672;font-size:11px;">${esc(r.situation)}</span></td>
      <td>${esc(r.quarter)} · ${esc(r.clock)}</td>
      <td>${esc(r.refereeName)}</td>
      <td><span class="report-eval-pill ${r.evaluation ?? "pending"}">${r.evaluation ? esc(evalLabel(r.evaluation)) : "Sin evaluar"}</span></td>
      <td>${r.whistleLabel ? esc(r.whistleLabel) : "—"}</td>
      <td>${r.notes ? esc(r.notes) : "—"}</td>
    </tr>`
    )
    .join("");

  const whistleMax = Math.max(...data.whistleItems.map((w) => w.count), 1);
  const whistleBars = data.whistleItems
    .map(
      (w) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:170px;flex:0 0 170px;font-size:12px;color:#97A1AE;">${esc(w.label)}</div>
      <div style="flex:1;background:#1B222C;border-radius:5px;height:14px;overflow:hidden;"><div style="height:100%;background:#C79A3D;border-radius:5px;width:${(w.count / whistleMax) * 100}%;"></div></div>
      <div style="width:24px;text-align:right;font-family:monospace;font-size:12px;color:#97A1AE;">${w.count}</div>
    </div>`
    )
    .join("");

  const commentsHtml = data.comments
    .map((cm) => `<p style="margin:0 0 8px;"><b>${esc(cm.authorName)}</b>: ${esc(cm.text)}</p>`)
    .join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe de evaluación</title><style>${STANDALONE_CSS}</style></head><body>
  <div class="report-box">
    <p class="report-title">Informe de evaluación</p>
    <p class="report-sub">${esc(data.matchup)} · ${esc(data.fechaFmt)}${data.category ? " · " + esc(data.category) : ""}${data.competition ? " · " + esc(data.competition) : ""}<br>Árbitros: ${esc(data.refereesText)}</p>
    <div class="report-stat-row">
      <div class="report-stat"><div class="n">${data.total}</div><div class="l">Jugadas</div></div>
      <div class="report-stat"><div class="n" style="color:#F09595">${data.counts.mala}</div><div class="l">No recomendable</div></div>
      <div class="report-stat"><div class="n" style="color:#E8CE85">${data.counts.estandar}</div><div class="l">Estándar</div></div>
      <div class="report-stat"><div class="n" style="color:#7FCB8C">${data.counts.buena}</div><div class="l">Buena</div></div>
      <div class="report-stat"><div class="n" style="color:#7FE0C9">${data.counts.relevante}</div><div class="l">Relevante</div></div>
      <div class="report-stat"><div class="n">${data.pending}</div><div class="l">Sin evaluar</div></div>
    </div>
    ${
      data.rows.length === 0
        ? '<p style="font-size:13px;color:#5C6672;">Este partido no tiene jugadas cargadas.</p>'
        : `<table class="report-table"><thead><tr><th>Jugada</th><th>Momento</th><th>Árbitro</th><th>Evaluación</th><th>Silbato</th><th>Notas</th></tr></thead><tbody>${rows}</tbody></table>`
    }
    ${
      data.whistleClassified > 0
        ? `<div style="margin-bottom:20px;"><div style="font-size:11px;color:#5C6672;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:12px;">Tipo de silbato (${data.whistleClassified} de ${data.total} clips clasificados)</div>${whistleBars}</div>`
        : ""
    }
    ${commentsHtml ? `<div class="report-foot"><b style="color:#97A1AE;">Comentarios generales</b><div style="margin-top:8px;">${commentsHtml}</div></div>` : ""}
    ${data.finalizedByName ? `<div class="report-foot">Evaluación finalizada por <b style="color:#97A1AE;">${esc(data.finalizedByName)}</b>${data.finalizedAt ? " el " + esc(new Date(data.finalizedAt).toLocaleDateString("es-AR")) : ""}.</div>` : ""}
  </div>
</body></html>`;
}
