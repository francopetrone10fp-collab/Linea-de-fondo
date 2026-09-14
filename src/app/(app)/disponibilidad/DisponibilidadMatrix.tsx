"use client";

import { useMemo, useState } from "react";
import { weekDates, isWeekend } from "./weekUtils";
import { CATEGORIAS_DISPONIBILIDAD, DIAS_SEMANA } from "@/lib/constants";
import type { DisponibilidadDia } from "./queries";

export default function DisponibilidadMatrix({
  monday,
  referees,
  disponibilidadPorArbitro,
}: {
  monday: string;
  referees: { id: string; name: string }[];
  disponibilidadPorArbitro: Record<string, DisponibilidadDia[]>;
}) {
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const dates = weekDates(monday);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = referees;
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    if (categoriaFiltro) {
      list = list.filter((r) => {
        const rows = disponibilidadPorArbitro[r.id] ?? [];
        return rows.some((row) => isWeekend(row.fecha) && row.disponible && row.categorias.includes(categoriaFiltro));
      });
    }
    return list;
  }, [referees, q, categoriaFiltro, disponibilidadPorArbitro]);

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar árbitro..."
          className="flex-1 min-w-[200px]"
        />
        <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="text-[13px]">
          <option value="">Todas las categorías</option>
          {CATEGORIAS_DISPONIBILIDAD.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-line rounded-xl">
        <table className="w-full text-[12px] border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-surface-2 text-text-dim text-[10.5px] uppercase tracking-wide">
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line whitespace-nowrap sticky left-0 bg-surface-2">
                Árbitro
              </th>
              {dates.map((fecha, i) => (
                <th key={fecha} className="text-left font-semibold px-2.5 py-2 border-b border-line whitespace-nowrap">
                  {DIAS_SEMANA[i].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const rows = new Map((disponibilidadPorArbitro[r.id] ?? []).map((d) => [d.fecha, d]));
              return (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="px-2.5 py-2 whitespace-nowrap font-medium sticky left-0 bg-surface">{r.name}</td>
                  {dates.map((fecha) => (
                    <td key={fecha} className="px-2.5 py-2 whitespace-nowrap align-top">
                      <DayCell row={rows.get(fecha) ?? null} weekend={isWeekend(fecha)} />
                    </td>
                  ))}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2.5 py-4 text-text-faint text-center">
                  No hay árbitros que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DayCell({ row, weekend }: { row: DisponibilidadDia | null; weekend: boolean }) {
  // Entre semana, sin respuesta = disponible por default (solo hay que
  // marcar cuando alguien NO puede). El fin de semana sí necesita una
  // respuesta explícita.
  if (!row) {
    if (!weekend) {
      return (
        <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-good-bg text-good-text">
          Disponible
        </span>
      );
    }
    return <span className="text-text-faint">—</span>;
  }

  if (!weekend) {
    return row.disponible ? (
      <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-good-bg text-good-text">
        Disponible
      </span>
    ) : (
      <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-bad-bg text-bad-text">
        No disponible
      </span>
    );
  }

  if (!row.disponible || row.categorias.length === 0) {
    return (
      <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-bad-bg text-bad-text">
        No disponible
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 max-w-[160px]">
      {row.categorias.map((c) => (
        <span key={c} className="text-[10px] font-medium text-good-text">
          {c}
        </span>
      ))}
    </div>
  );
}
