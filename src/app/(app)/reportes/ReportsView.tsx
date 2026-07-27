"use client";

import { useMemo, useState } from "react";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { DonutChart, ChartLegend } from "@/components/charts/DonutChart";
import { BarsChart } from "@/components/charts/BarsChart";
import { StatCard } from "@/components/StatCard";
import RotateHint from "@/components/RotateHint";
import { SITUATIONS, WHISTLE_TYPES, EVAL_LEVELS, evalLabel, whistleTypeInfo } from "@/lib/constants";
import { EMPTY_FILTERS, applyReportFilters, filtersToSearchParams, type ReportFilters } from "./filters";
import { buildAggregateStats } from "./aggregate";
import type { ReportClipRow } from "./queries";

const EVAL_PILL_CLASSES: Record<string, string> = {
  mala: "bg-bad-bg text-bad-text",
  estandar: "bg-amber-bg text-amber-text",
  buena: "bg-good-bg text-good-text",
  relevante: "bg-relevant-bg text-relevant-text",
  pending: "bg-surface-3 text-text-faint",
};

function matchupText(r: ReportClipRow) {
  if (!r.teamLocal && !r.teamVisit) return "Sin equipos cargados";
  return `${r.teamLocal?.name ?? "?"} vs ${r.teamVisit?.name ?? "?"}`;
}

function fechaFmt(fecha: string | null) {
  return fecha ? new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Sin fecha";
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

export default function ReportsView({
  clips,
  teams,
  referees,
  seasons,
}: {
  clips: ReportClipRow[];
  teams: { id: string; name: string }[];
  referees: { id: string; name: string }[];
  seasons: string[];
}) {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);

  function setFilter<K extends keyof ReportFilters>(key: K, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const rows = useMemo(() => {
    const filtered = applyReportFilters(clips, filters);
    return [...filtered].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  }, [clips, filters]);

  const stats = useMemo(() => buildAggregateStats(rows), [rows]);

  const hasFilters = Object.values(filters).some(Boolean);

  function downloadCsv() {
    const headers = ["Partido", "Fecha", "Temporada", "Árbitro", "Jugada", "Tipo", "Cuarto", "Reloj", "Evaluación", "Silbato"];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      lines.push(
        [
          csvEscape(matchupText(r)),
          csvEscape(r.fecha ?? "Sin fecha"),
          csvEscape(r.partidoTemporada),
          csvEscape(r.referee?.name ?? "Sin especificar"),
          csvEscape(r.title),
          csvEscape(r.situation),
          csvEscape(r.quarter),
          csvEscape(r.clock ?? ""),
          csvEscape(r.evaluation ? evalLabel(r.evaluation) : "Sin evaluar"),
          csvEscape(r.whistleType ? (whistleTypeInfo(r.whistleType)?.label ?? "") : ""),
        ].join(",")
      );
    });
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-linea-de-fondo-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadPdf() {
    const params = filtersToSearchParams(filters);
    window.open(`/reportes/print?${params.toString()}`, "_blank");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Reportes</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3.5 py-2.5 disabled:opacity-50"
          >
            Descargar datos (CSV)
          </button>
          <button
            onClick={downloadPdf}
            disabled={rows.length === 0}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            Descargar PDF
          </button>
        </div>
      </div>

      <RotateHint message="Para ver mejor la tabla, girá el celular a horizontal." />

      <div className="bg-surface border border-line rounded-xl p-4 mb-6">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          <Field label="Desde">
            <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className="w-full" />
          </Field>
          <Field label="Hasta">
            <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className="w-full" />
          </Field>
          <Field label="Temporada">
            <select value={filters.temporada} onChange={(e) => setFilter("temporada", e.target.value)} className="w-full">
              <option value="">Todas</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipo">
            <select value={filters.teamId} onChange={(e) => setFilter("teamId", e.target.value)} className="w-full">
              <option value="">Todos</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Árbitro">
            <select value={filters.refereeId} onChange={(e) => setFilter("refereeId", e.target.value)} className="w-full">
              <option value="">Todos</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de jugada">
            <select value={filters.situation} onChange={(e) => setFilter("situation", e.target.value)} className="w-full">
              <option value="">Todos</option>
              {SITUATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de silbato">
            <select value={filters.whistleType} onChange={(e) => setFilter("whistleType", e.target.value)} className="w-full">
              <option value="">Todos</option>
              {WHISTLE_TYPES.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label} — {w.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Evaluación">
            <select value={filters.evaluation} onChange={(e) => setFilter("evaluation", e.target.value)} className="w-full">
              <option value="">Todas</option>
              {EVAL_LEVELS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {hasFilters && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-[12.5px] text-text-dim hover:text-text mt-3 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty
          title="Sin resultados"
          desc={hasFilters ? "Ninguna jugada coincide con esos filtros." : "Todavía no hay jugadas cargadas."}
        />
      ) : (
        <>
          <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <StatCard label="Jugadas" value={stats.total} />
            <StatCard label="No recomendable" value={stats.counts.mala} colorClass="text-bad-text" />
            <StatCard label="Estándar" value={stats.counts.estandar} colorClass="text-amber-text" />
            <StatCard label="Buena" value={stats.counts.buena} colorClass="text-good-text" />
            <StatCard label="Relevante" value={stats.counts.relevante} colorClass="text-relevant-text" />
            <StatCard label="Sin evaluar" value={stats.pending} />
          </div>

          <div className="flex gap-8 flex-wrap mb-8">
            <div className="flex-1 min-w-[260px]">
              <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
                Por nivel de evaluación
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <DonutChart segments={stats.segments} />
                <div className="flex-1 min-w-[140px]">
                  <ChartLegend segments={stats.segments} />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-[260px]">
              <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
                Jugadas por tipo
              </div>
              <BarsChart items={stats.situationItems} />
            </div>
          </div>

          <div className="mb-8">
            <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-1">
              Por tipo de silbato
            </div>
            <p className="text-[11.5px] text-text-faint mb-3.5">
              {stats.whistleClassified} de {stats.total} clips clasificados.
            </p>
            <BarsChart items={stats.whistleItems} />
          </div>

          <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mb-3.5">
            Jugadas ({rows.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px] mb-5">
              <thead>
                <tr>
                  {["Partido", "Fecha", "Árbitro", "Tipo", "Evaluación"].map((h) => (
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
                      {matchupText(r)}
                      <br />
                      <span className="text-text-faint text-[11px]">{r.title}</span>
                    </td>
                    <td className="py-2 px-2 border-b border-line align-top whitespace-nowrap">{fechaFmt(r.fecha)}</td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.referee?.name ?? "—"}</td>
                    <td className="py-2 px-2 border-b border-line align-top">{r.situation}</td>
                    <td className="py-2 px-2 border-b border-line align-top">
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          EVAL_PILL_CLASSES[r.evaluation ?? "pending"]
                        }`}
                      >
                        {r.evaluation ? evalLabel(r.evaluation) : "Sin evaluar"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11.5px] text-text-dim font-medium">{label}</label>
      {children}
    </div>
  );
}
