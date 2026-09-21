"use client";

import { useState, useTransition } from "react";
import { setDisponibilidadDia, clearDisponibilidadDia } from "./actions";
import { weekDates, isWeekend, isSunday, formatDayLabel, mondayOf } from "@/lib/weekUtils";
import { CATEGORIAS_DISPONIBILIDAD, CATEGORIAS_DISPONIBILIDAD_SABADO, DIAS_SEMANA } from "@/lib/constants";
import type { DisponibilidadDia } from "./queries";

export default function MiDisponibilidadView({
  monday,
  miDisponibilidad,
  isAdmin,
}: {
  monday: string;
  miDisponibilidad: DisponibilidadDia[];
  isAdmin: boolean;
}) {
  const porFecha = new Map(miDisponibilidad.map((d) => [d.fecha, d]));
  const dates = weekDates(monday);

  const esSemanaActual = monday === mondayOf(new Date().toISOString().slice(0, 10));
  const faltaFinDeSemana = esSemanaActual && (!porFecha.has(dates[5]) || !porFecha.has(dates[6]));
  // Una semana ya pasada no se puede volver a tocar (salvo coordinador/
  // instructor, que sí pueden corregir a pedido de un árbitro) — evita que se
  // reescriba disponibilidad de partidos que ya se jugaron.
  const readOnly = !isAdmin && monday < mondayOf(new Date().toISOString().slice(0, 10));

  return (
    <div className="flex flex-col gap-2.5">
      {readOnly && (
        <div className="bg-surface-2 border border-line rounded-xl px-4 py-3 text-[13px] text-text-dim mb-1">
          Esta semana ya pasó, así que no se puede modificar.
        </div>
      )}
      {faltaFinDeSemana && (
        <div className="bg-amber-bg text-amber-text border border-amber rounded-xl px-4 py-3 text-[13px] font-medium mb-1">
          Todavía no cargaste tu disponibilidad para este sábado y/o domingo. Marcala abajo para que te puedan designar.
        </div>
      )}
      {dates.map((fecha, i) => (
        <DayCard key={fecha} fecha={fecha} diaLabel={DIAS_SEMANA[i].label} row={porFecha.get(fecha) ?? null} readOnly={readOnly} />
      ))}
    </div>
  );
}

function DayCard({ fecha, diaLabel, row, readOnly }: { fecha: string; diaLabel: string; row: DisponibilidadDia | null; readOnly: boolean }) {
  const weekend = isWeekend(fecha);
  // Entre semana se considera disponible por default, salvo que el árbitro
  // marque lo contrario. El fin de semana sí necesita una respuesta explícita
  // (no hay categoría "por default").
  const [disponible, setDisponible] = useState(row?.disponible ?? !weekend);
  const [categorias, setCategorias] = useState<string[]>(row?.categorias ?? []);
  const [respondido, setRespondido] = useState(row !== null);
  const [isPending, startTransition] = useTransition();

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
    let nuevas: string[];
    if (yaEsta) {
      nuevas = categorias.filter((c) => c !== cat);
    } else if (cat === "FULL TIME") {
      // FULL TIME cubre cualquier categoría: no tiene sentido combinarlo con otras.
      nuevas = ["FULL TIME"];
    } else {
      nuevas = [...categorias.filter((c) => c !== "FULL TIME"), cat];
    }
    guardar(nuevas.length > 0, nuevas);
  }

  function onNoDisponible() {
    guardar(false, []);
  }

  function onDesmarcarTodo() {
    setDisponible(!weekend);
    setCategorias([]);
    setRespondido(false);
    startTransition(async () => {
      const res = await clearDisponibilidadDia(fecha);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <div className={`bg-surface border border-line rounded-xl px-4 py-3 ${isPending ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <span className="text-[13.5px] font-semibold">
          {diaLabel} <span className="text-text-faint font-normal">· {formatDayLabel(fecha)}</span>
        </span>
        {weekend && !respondido && <span className="text-[10.5px] text-text-faint uppercase tracking-wide">Sin responder</span>}
      </div>

      {!weekend ? (
        <div className="flex gap-2">
          <button
            onClick={() => guardar(true, [])}
            disabled={readOnly}
            className={`text-[12.5px] font-semibold rounded-lg px-3.5 py-2 border disabled:cursor-not-allowed disabled:opacity-60 ${
              disponible ? "bg-good-bg text-good-text border-good" : "bg-transparent text-text-dim border-line"
            }`}
          >
            Disponible
          </button>
          <button
            onClick={() => guardar(false, [])}
            disabled={readOnly}
            className={`text-[12.5px] font-semibold rounded-lg px-3.5 py-2 border disabled:cursor-not-allowed disabled:opacity-60 ${
              !disponible ? "bg-bad-bg text-bad-text border-bad" : "bg-transparent text-text-dim border-line"
            }`}
          >
            No disponible
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(isSunday(fecha) ? CATEGORIAS_DISPONIBILIDAD : CATEGORIAS_DISPONIBILIDAD_SABADO).map((cat) => {
            const checked = categorias.includes(cat);
            return (
              <label
                key={cat}
                className={`flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1.5 border ${
                  readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                } ${checked ? "bg-good-bg text-good-text border-good" : "bg-transparent text-text-dim border-line"}`}
              >
                <input type="checkbox" checked={checked} disabled={readOnly} onChange={() => onToggleCategoria(cat)} className="hidden" />
                {cat}
              </label>
            );
          })}
          <label
            className={`flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1.5 border ${
              readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            } ${respondido && !disponible ? "bg-bad-bg text-bad-text border-bad" : "bg-transparent text-text-dim border-line"}`}
          >
            <input type="checkbox" checked={respondido && !disponible} disabled={readOnly} onChange={onNoDisponible} className="hidden" />
            NO DISPONIBLE
          </label>
          {respondido && !readOnly && (
            <button
              onClick={onDesmarcarTodo}
              className="text-[12px] text-text-faint hover:text-text underline px-1"
            >
              Desmarcar todo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
