"use client";

import { useState, useTransition } from "react";
import { deleteTarifa, upsertTarifa } from "./actions";
import type { TarifaCategoria } from "./queries";

export default function TarifasView({ tarifas }: { tarifas: TarifaCategoria[] }) {
  return (
    <div>
      <p className="text-[12.5px] text-text-faint mb-3">
        Un monto por categoría, usado para calcular automáticamente lo que cobra cada árbitro y el comisionado técnico al
        asignarlos a un partido. Si una categoría no tiene tarifa cargada, la designación se guarda igual pero el monto queda
        en $0 hasta que la completes acá.
      </p>
      <div className="overflow-x-auto border border-line rounded-xl">
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="bg-surface-2 text-text-dim text-[11px] uppercase tracking-wide">
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Categoría</th>
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Árbitro 1</th>
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Árbitro 2 / 3</th>
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line">Comisionado técnico</th>
              <th className="px-2.5 py-2 border-b border-line"></th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((t) => (
              <TarifaRow key={t.categoria} tarifa={t} />
            ))}
            <NuevaTarifaRow />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TarifaRow({ tarifa }: { tarifa: TarifaCategoria }) {
  const [isPending, startTransition] = useTransition();

  function onChange(field: "montoArbitro1" | "montoArbitro2" | "montoCt", value: string) {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    startTransition(async () => {
      await upsertTarifa({
        categoria: tarifa.categoria,
        montoArbitro1: field === "montoArbitro1" ? num : tarifa.montoArbitro1,
        montoArbitro2: field === "montoArbitro2" ? num : tarifa.montoArbitro2,
        montoCt: field === "montoCt" ? num : tarifa.montoCt,
      });
    });
  }

  function onDelete() {
    if (!confirm(`¿Eliminar la tarifa de "${tarifa.categoria}"?`)) return;
    startTransition(async () => {
      await deleteTarifa(tarifa.categoria);
    });
  }

  return (
    <tr className={`border-b border-line last:border-b-0 ${isPending ? "opacity-60" : ""}`}>
      <td className="px-2.5 py-2 font-medium">{tarifa.categoria}</td>
      <td className="px-2.5 py-2">
        <MoneyInput value={tarifa.montoArbitro1} onCommit={(v) => onChange("montoArbitro1", v)} />
      </td>
      <td className="px-2.5 py-2">
        <MoneyInput value={tarifa.montoArbitro2} onCommit={(v) => onChange("montoArbitro2", v)} />
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
  const [categoria, setCategoria] = useState("");
  const [montoArbitro1, setMontoArbitro1] = useState("0");
  const [montoArbitro2, setMontoArbitro2] = useState("0");
  const [montoCt, setMontoCt] = useState("0");
  const [isPending, startTransition] = useTransition();

  function onAdd() {
    const trimmed = categoria.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await upsertTarifa({
        categoria: trimmed,
        montoArbitro1: Number(montoArbitro1) || 0,
        montoArbitro2: Number(montoArbitro2) || 0,
        montoCt: Number(montoCt) || 0,
      });
      if (res.ok) {
        setCategoria("");
        setMontoArbitro1("0");
        setMontoArbitro2("0");
        setMontoCt("0");
      }
    });
  }

  return (
    <tr>
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
        <input type="number" value={montoArbitro1} onChange={(e) => setMontoArbitro1(e.target.value)} className="w-24" />
      </td>
      <td className="px-2.5 py-2">
        <input type="number" value={montoArbitro2} onChange={(e) => setMontoArbitro2(e.target.value)} className="w-24" />
      </td>
      <td className="px-2.5 py-2">
        <input type="number" value={montoCt} onChange={(e) => setMontoCt(e.target.value)} className="w-24" />
      </td>
      <td className="px-2.5 py-2">
        <button
          disabled={isPending || !categoria.trim()}
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
