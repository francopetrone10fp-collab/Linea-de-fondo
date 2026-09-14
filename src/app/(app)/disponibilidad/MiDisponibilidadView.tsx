"use client";

import { useState, useTransition } from "react";
import { setDisponibilidadDia } from "./actions";
import { weekDates, isWeekend, formatDayLabel } from "./weekUtils";
import { CATEGORIAS_DISPONIBILIDAD, DIAS_SEMANA } from "@/lib/constants";
import type { DisponibilidadDia } from "./queries";

export default function MiDisponibilidadView({ monday, miDisponibilidad }: { monday: string; miDisponibilidad: DisponibilidadDia[] }) {
  const porFecha = new Map(miDisponibilidad.map((d) => [d.fecha, d]));
  const dates = weekDates(monday);

  return (
    <div className="flex flex-col gap-2.5">
      {dates.map((fecha, i) => (
        <DayCard key={fecha} fecha={fecha} diaLabel={DIAS_SEMANA[i].label} row={porFecha.get(fecha) ?? null} />
      ))}
    </div>
  );
}

function DayCard({ fecha, diaLabel, row }: { fecha: string; diaLabel: string; row: DisponibilidadDia | null }) {
  const [disponible, setDisponible] = useState(row?.disponible ?? null);
  const [categorias, setCategorias] = useState<string[]>(row?.categorias ?? []);
  const [respondido, setRespondido] = useState(row !== null);
  const [isPending, startTransition] = useTransition();
  const weekend = isWeekend(fecha);

  function guardar(nuevoDisponible: boolean, nuevasCategorias: string[]) {
    setDisponible(nuevoDisponible);
    setCategorias(nuevasCategorias);
    setRespondido(true);
    startTransition(async () => {
      const res = await setDisponibilidadDia(fecha, nuevoDisponible, nuevasCategorias);
      if (!res.ok) alert(res.error);
    });
  }

  function onToggleCategoria(cat: string) {
    const yaEsta = categorias.includes(cat);
    const nuevas = yaEsta ? categorias.filter((c) => c !== cat) : [...categorias, cat];
    guardar(nuevas.length > 0, nuevas);
  }

  function onNoDisponible() {
    guardar(false, []);
  }

  return (
    <div className={`bg-surface border border-line rounded-xl px-4 py-3 ${isPending ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <span className="text-[13.5px] font-semibold">
          {diaLabel} <span className="text-text-faint font-normal">· {formatDayLabel(fecha)}</span>
        </span>
        {!respondido && <span className="text-[10.5px] text-text-faint uppercase tracking-wide">Sin responder</span>}
      </div>

      {!weekend ? (
        <div className="flex gap-2">
          <button
            onClick={() => guardar(true, [])}
            className={`text-[12.5px] font-semibold rounded-lg px-3.5 py-2 border ${
              respondido && disponible ? "bg-good-bg text-good-text border-good" : "bg-transparent text-text-dim border-line"
            }`}
          >
            Disponible
          </button>
          <button
            onClick={() => guardar(false, [])}
            className={`text-[12.5px] font-semibold rounded-lg px-3.5 py-2 border ${
              respondido && !disponible ? "bg-bad-bg text-bad-text border-bad" : "bg-transparent text-text-dim border-line"
            }`}
          >
            No disponible
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_DISPONIBILIDAD.map((cat) => {
            const checked = categorias.includes(cat);
            return (
              <label
                key={cat}
                className={`flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1.5 border cursor-pointer ${
                  checked ? "bg-good-bg text-good-text border-good" : "bg-transparent text-text-dim border-line"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggleCategoria(cat)} className="hidden" />
                {cat}
              </label>
            );
          })}
          <label
            className={`flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1.5 border cursor-pointer ${
              respondido && !disponible ? "bg-bad-bg text-bad-text border-bad" : "bg-transparent text-text-dim border-line"
            }`}
          >
            <input type="checkbox" checked={respondido && !disponible} onChange={onNoDisponible} className="hidden" />
            NO DISPONIBLE
          </label>
        </div>
      )}
    </div>
  );
}
