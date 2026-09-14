"use client";

import { useState, useTransition } from "react";
import { deleteTarifa, deleteViatico, upsertTarifa, upsertViatico } from "./actions";
import type { TarifaModo } from "@/lib/database.types";
import type { TarifaCategoria, ViaticoLocalidad } from "./queries";

const MODOS: { key: TarifaModo; label: string }[] = [
  { key: "por_arbitro", label: "Por árbitro" },
  { key: "total_partido", label: "Total del partido (se reparte)" },
];

export default function TarifasView({ tarifas, viaticos }: { tarifas: TarifaCategoria[]; viaticos: ViaticoLocalidad[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[12.5px] text-text-faint mb-3">
          Un monto por competencia + categoría, usado para calcular automáticamente lo que cobra cada árbitro y el
          comisionado técnico al asignarlos a un partido. “Total del partido” es para casos como Pre-mini/Mini, donde se
          paga un monto fijo que se reparte entre los árbitros que asistieron (1 o 2). Si falta la tarifa de una
          categoría, la designación se guarda igual pero el monto queda en $0 hasta que la completes acá.
        </p>
        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="bg-surface-2 text-text-dim text-[11px] uppercase tracking-wide">
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Competencia</th>
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Categoría</th>
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Modo</th>
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Monto árbitro</th>
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Comisionado técnico</th>
                <th className="px-2.5 py-2 border-b border-line"></th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map((t) => (
                <TarifaRow key={`${t.competencia}::${t.categoria}`} tarifa={t} />
              ))}
              <NuevaTarifaRow />
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-[12.5px] text-text-faint mb-3">
          Viáticos por localidad: se cobran en cancha, en efectivo, pagados por el club local. Son solo informativos — no
          se suman al total de “cuánto gana” de cada árbitro.
        </p>
        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="bg-surface-2 text-text-dim text-[11px] uppercase tracking-wide">
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Localidad</th>
                <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Monto</th>
                <th className="px-2.5 py-2 border-b border-line"></th>
              </tr>
            </thead>
            <tbody>
              {viaticos.map((v) => (
                <ViaticoRow key={v.localidad} viatico={v} />
              ))}
              <NuevoViaticoRow />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TarifaRow({ tarifa }: { tarifa: TarifaCategoria }) {
  const [isPending, startTransition] = useTransition();

  function onChange(field: "modo" | "montoArbitro" | "montoCt", value: string) {
    startTransition(async () => {
      await upsertTarifa({
        competencia: tarifa.competencia,
        categoria: tarifa.categoria,
        modo: field === "modo" ? (value as TarifaModo) : tarifa.modo,
        montoArbitro: field === "montoArbitro" ? Number(value) || 0 : tarifa.montoArbitro,
        montoCt: field === "montoCt" ? Number(value) || 0 : tarifa.montoCt,
      });
    });
  }

  function onDelete() {
    if (!confirm(`¿Eliminar la tarifa de "${tarifa.competencia} · ${tarifa.categoria}"?`)) return;
    startTransition(async () => {
      await deleteTarifa(tarifa.competencia, tarifa.categoria);
    });
  }

  return (
    <tr className={`border-b border-line last:border-b-0 ${isPending ? "opacity-60" : ""}`}>
      <td className="px-2.5 py-2 text-text-dim whitespace-nowrap">{tarifa.competencia}</td>
      <td className="px-2.5 py-2 font-medium whitespace-nowrap">{tarifa.categoria}</td>
      <td className="px-2.5 py-2">
        <select value={tarifa.modo} onChange={(e) => onChange("modo", e.target.value)} className="min-w-[190px]">
          {MODOS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2.5 py-2">
        <MoneyInput value={tarifa.montoArbitro} onCommit={(v) => onChange("montoArbitro", v)} />
      </td>
      <td className="px-2.5 py-2">
        <MoneyInput value={tarifa.montoCt} onCommit={(v) => onChange("montoCt", v)} />
      </td>
      <td className="px-2.5 py-2">
        <button onClick={onDelete} title="Eliminar" className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function NuevaTarifaRow() {
  const [competencia, setCompetencia] = useState("");
  const [categoria, setCategoria] = useState("");
  const [modo, setModo] = useState<TarifaModo>("por_arbitro");
  const [montoArbitro, setMontoArbitro] = useState("0");
  const [montoCt, setMontoCt] = useState("0");
  const [isPending, startTransition] = useTransition();

  function onAdd() {
    if (!competencia.trim() || !categoria.trim()) return;
    startTransition(async () => {
      const res = await upsertTarifa({
        competencia: competencia.trim(),
        categoria: categoria.trim(),
        modo,
        montoArbitro: Number(montoArbitro) || 0,
        montoCt: Number(montoCt) || 0,
      });
      if (res.ok) {
        setCompetencia("");
        setCategoria("");
        setModo("por_arbitro");
        setMontoArbitro("0");
        setMontoCt("0");
      }
    });
  }

  return (
    <tr>
      <td className="px-2.5 py-2">
        <input type="text" value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="LFF" className="min-w-[100px]" />
      </td>
      <td className="px-2.5 py-2">
        <input
          type="text"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Nueva categoría"
          className="min-w-[160px]"
        />
      </td>
      <td className="px-2.5 py-2">
        <select value={modo} onChange={(e) => setModo(e.target.value as TarifaModo)} className="min-w-[190px]">
          {MODOS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2.5 py-2">
        <input type="number" value={montoArbitro} onChange={(e) => setMontoArbitro(e.target.value)} className="w-24" />
      </td>
      <td className="px-2.5 py-2">
        <input type="number" value={montoCt} onChange={(e) => setMontoCt(e.target.value)} className="w-24" />
      </td>
      <td className="px-2.5 py-2">
        <button
          disabled={isPending || !competencia.trim() || !categoria.trim()}
          onClick={onAdd}
          className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[12px] px-3 py-1.5 whitespace-nowrap"
        >
          + Agregar
        </button>
      </td>
    </tr>
  );
}

function ViaticoRow({ viatico }: { viatico: ViaticoLocalidad }) {
  const [isPending, startTransition] = useTransition();

  function onCommit(value: string) {
    startTransition(async () => {
      await upsertViatico(viatico.localidad, Number(value) || 0);
    });
  }

  function onDelete() {
    if (!confirm(`¿Eliminar el viático de "${viatico.localidad}"?`)) return;
    startTransition(async () => {
      await deleteViatico(viatico.localidad);
    });
  }

  return (
    <tr className={`border-b border-line last:border-b-0 ${isPending ? "opacity-60" : ""}`}>
      <td className="px-2.5 py-2 font-medium">{viatico.localidad}</td>
      <td className="px-2.5 py-2">
        <MoneyInput value={viatico.monto} onCommit={onCommit} />
      </td>
      <td className="px-2.5 py-2">
        <button onClick={onDelete} title="Eliminar" className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function NuevoViaticoRow() {
  const [localidad, setLocalidad] = useState("");
  const [monto, setMonto] = useState("0");
  const [isPending, startTransition] = useTransition();

  function onAdd() {
    if (!localidad.trim()) return;
    startTransition(async () => {
      const res = await upsertViatico(localidad.trim(), Number(monto) || 0);
      if (res.ok) {
        setLocalidad("");
        setMonto("0");
      }
    });
  }

  return (
    <tr>
      <td className="px-2.5 py-2">
        <input
          type="text"
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
          placeholder="Nueva localidad"
          className="min-w-[160px]"
        />
      </td>
      <td className="px-2.5 py-2">
        <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-24" />
      </td>
      <td className="px-2.5 py-2">
        <button
          disabled={isPending || !localidad.trim()}
          onClick={onAdd}
          className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[12px] px-3 py-1.5 whitespace-nowrap"
        >
          + Agregar
        </button>
      </td>
    </tr>
  );
}

function MoneyInput({ value, onCommit }: { value: number; onCommit: (v: string) => void }) {
  return (
    <input
      key={value}
      type="number"
      defaultValue={value}
      onBlur={(e) => e.target.value !== String(value) && onCommit(e.target.value)}
      className="w-24"
    />
  );
}
