"use client";

import { useMemo, useState, useTransition } from "react";
import { computeTotalesPorArbitro } from "@/lib/constants";
import SectionIcon from "@/components/SectionIcon";
import { downloadCsv } from "@/lib/csv";
import { money } from "../designaciones/DesignacionesGrid";
import { buildDesignacionesTotalesHtml, openHtmlForPrint } from "../designaciones/reportHtml";
import { addLiquidacionManual, deleteLiquidacionManual } from "./actions";
import type { DesignacionFull } from "../designaciones/queries";
import type { LiquidacionManual } from "./queries";

export default function LiquidacionesView({
  designaciones,
  manuales,
  referees,
  month,
  desde,
  hasta,
  customRange,
}: {
  designaciones: DesignacionFull[];
  manuales: LiquidacionManual[];
  referees: { id: string; name: string }[];
  month: string;
  desde: string;
  hasta: string;
  customRange: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    window.location.href = `/liquidaciones?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function applyRange(nextDesde: string, nextHasta: string) {
    if (nextDesde && nextHasta && nextDesde <= nextHasta) {
      window.location.href = `/liquidaciones?desde=${nextDesde}&hasta=${nextHasta}`;
    }
  }

  function clearRange() {
    window.location.href = "/liquidaciones";
  }

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [month]);

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  const rangeLabel = customRange ? `${formatDate(desde)} – ${formatDate(hasta)}` : monthLabel;
  const rangeSlug = customRange ? `${desde}_a_${hasta}` : month;

  const totales = useMemo(
    () => computeTotalesPorArbitro(designaciones, referees, manuales.map((m) => ({ refereeId: m.refereeId, monto: m.monto }))),
    [designaciones, referees, manuales]
  );

  function exportCsv() {
    const rows = totales.map((t) => [t.nombre, t.partidos, t.total]);
    downloadCsv(`liquidaciones_${rangeSlug}.csv`, ["Árbitro", "Partidos", "Total"], rows);
  }

  function exportPdf() {
    openHtmlForPrint(buildDesignacionesTotalesHtml(totales, rangeLabel));
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1.5">
        <SectionIcon view="liquidaciones" />
        <h1 className="font-display text-2xl font-semibold">Liquidaciones</h1>
      </div>
      <p className="text-text-dim text-[13px] m-0 mb-4">
        Total que cobra cada árbitro en el período (partidos dirigidos, comisionado técnico y montos manuales).
      </p>

      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-lg px-1 py-1">
          <button onClick={() => changeMonth(-1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Mes anterior">
            ‹
          </button>
          <span className="text-[13px] font-medium px-1.5 min-w-[130px] text-center capitalize">{rangeLabel}</span>
          <button onClick={() => changeMonth(1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <RangeFilter key={`${desde}|${hasta}`} desde={desde} hasta={hasta} customRange={customRange} onApply={applyRange} onClear={clearRange} />
        <div className="flex-1" />
        <button
          onClick={exportCsv}
          className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
        >
          Exportar CSV
        </button>
        <button
          onClick={exportPdf}
          className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
        >
          Exportar PDF
        </button>
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden mb-6">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-text-faint">
              <th className="px-3.5 py-2.5 font-semibold">Árbitro</th>
              <th className="px-3.5 py-2.5 font-semibold text-right">Partidos</th>
              <th className="px-3.5 py-2.5 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {totales.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3.5 py-6 text-center text-text-faint">
                  No hay datos para este período.
                </td>
              </tr>
            ) : (
              totales.map((t) => (
                <tr key={t.refereeId} className="border-b border-line last:border-b-0">
                  <td className="px-3.5 py-2">{t.nombre}</td>
                  <td className="px-3.5 py-2 text-right font-mono">{t.partidos}</td>
                  <td className="px-3.5 py-2 text-right font-mono font-semibold">{money.format(t.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim m-0">Montos manuales</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[12.5px] px-3.5 py-2"
        >
          {showForm ? "Cancelar" : "+ Agregar monto"}
        </button>
      </div>
      <p className="text-text-dim text-[12.5px] m-0 mb-3">
        Para un partido que no pasó por Designaciones (amistoso, otro torneo) o cualquier otro monto puntual que haya que sumarle
        a un árbitro — no afecta la grilla de Designaciones, solo el total que se ve acá.
      </p>

      {showForm && (
        <ManualForm referees={referees} defaultFecha={hasta < new Date().toISOString().slice(0, 10) ? hasta : new Date().toISOString().slice(0, 10)} onDone={() => setShowForm(false)} />
      )}

      <ManualList items={manuales} />
    </div>
  );
}

function RangeFilter({
  desde,
  hasta,
  customRange,
  onApply,
  onClear,
}: {
  desde: string;
  hasta: string;
  customRange: boolean;
  onApply: (desde: string, hasta: string) => void;
  onClear: () => void;
}) {
  const [desdeInput, setDesdeInput] = useState(desde);
  const [hastaInput, setHastaInput] = useState(hasta);

  return (
    <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-lg px-2 py-1">
      <span className="text-[10.5px] text-text-faint uppercase tracking-wide">Rango</span>
      <input
        type="date"
        value={desdeInput}
        onChange={(e) => {
          setDesdeInput(e.target.value);
          onApply(e.target.value, hastaInput);
        }}
        title="Desde"
        className="text-[13px]"
      />
      <span className="text-text-faint text-[12px]">–</span>
      <input
        type="date"
        value={hastaInput}
        onChange={(e) => {
          setHastaInput(e.target.value);
          onApply(desdeInput, e.target.value);
        }}
        title="Hasta"
        className="text-[13px]"
      />
      {customRange && (
        <button onClick={onClear} title="Volver a la vista mensual" className="text-text-faint hover:text-text px-1 text-[13px]">
          ×
        </button>
      )}
    </div>
  );
}

function ManualForm({
  referees,
  defaultFecha,
  onDone,
}: {
  referees: { id: string; name: string }[];
  defaultFecha: string;
  onDone: () => void;
}) {
  const [refereeId, setRefereeId] = useState("");
  const [fecha, setFecha] = useState(defaultFecha);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addLiquidacionManual({ refereeId, fecha, concepto, monto: Number(monto) });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="bg-surface-2 border border-line rounded-xl p-3.5 mb-4 flex flex-col gap-2.5">
      <div className="flex gap-2.5 flex-wrap">
        <select value={refereeId} onChange={(e) => setRefereeId(e.target.value)} required className="flex-1 min-w-[180px]">
          <option value="">Elegí un árbitro...</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="min-w-[150px]" />
      </div>
      <input
        type="text"
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        placeholder="Concepto — ej: Amistoso vs Rosario Central, Bono diciembre..."
        required
        className="w-full"
      />
      <div className="flex gap-2.5 items-center flex-wrap">
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto"
          min="0"
          step="1"
          required
          className="min-w-[150px]"
        />
        <button
          disabled={isPending}
          className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13px] px-4 py-2"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-bad-text text-[12.5px] m-0">{error}</p>}
    </form>
  );
}

function ManualList({ items }: { items: LiquidacionManual[] }) {
  const [isPending, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este monto manual?")) return;
    startTransition(async () => {
      await deleteLiquidacionManual(id);
    });
  }

  if (items.length === 0) {
    return <p className="text-[12.5px] text-text-faint m-0">Todavía no hay montos manuales cargados para este período.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((m) => (
        <div key={m.id} className="bg-surface border border-line rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[13px] font-semibold m-0">{m.refereeName}</p>
            <p className="text-[12px] text-text-dim m-0 mt-0.5">
              {new Date(m.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })} ·{" "}
              {m.concepto}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-[14px] font-semibold">{money.format(m.monto)}</span>
            <button
              onClick={() => onDelete(m.id)}
              disabled={isPending}
              title="Eliminar"
              className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
