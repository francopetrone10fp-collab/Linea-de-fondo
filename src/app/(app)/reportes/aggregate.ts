import { EVAL_COLORS, WHISTLE_TYPES } from "@/lib/constants";
import type { Evaluation } from "@/lib/database.types";
import type { ReportClipRow } from "./queries";

const EMPTY_COUNTS: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };

export interface AggregateStats {
  total: number;
  counts: Record<Evaluation, number>;
  pending: number;
  segments: { label: string; value: number; color: string }[];
  situationItems: { label: string; count: number }[];
  whistleItems: { label: string; count: number }[];
  whistleClassified: number;
}

export function buildAggregateStats(rows: ReportClipRow[]): AggregateStats {
  const counts: Record<Evaluation, number> = { ...EMPTY_COUNTS };
  let pending = 0;
  rows.forEach((r) => {
    if (r.evaluation) counts[r.evaluation]++;
    else pending++;
  });

  const situationCounts: Record<string, number> = {};
  rows.forEach((r) => {
    situationCounts[r.situation] = (situationCounts[r.situation] ?? 0) + 1;
  });
  const situationItems = Object.entries(situationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const whistleCounts: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.whistleType) whistleCounts[r.whistleType] = (whistleCounts[r.whistleType] ?? 0) + 1;
  });
  const whistleItems = WHISTLE_TYPES.map((w) => ({
    label: `${w.label} — ${w.fullName}`,
    count: whistleCounts[w.key] ?? 0,
  }));
  const whistleClassified = WHISTLE_TYPES.reduce((sum, w) => sum + (whistleCounts[w.key] ?? 0), 0);

  const segments = [
    { label: "No recomendable", value: counts.mala, color: EVAL_COLORS.mala },
    { label: "Estándar", value: counts.estandar, color: EVAL_COLORS.estandar },
    { label: "Buena", value: counts.buena, color: EVAL_COLORS.buena },
    { label: "Relevante", value: counts.relevante, color: EVAL_COLORS.relevante },
    { label: "Sin evaluar", value: pending, color: EVAL_COLORS.pending },
  ];

  return { total: rows.length, counts, pending, segments, situationItems, whistleItems, whistleClassified };
}
