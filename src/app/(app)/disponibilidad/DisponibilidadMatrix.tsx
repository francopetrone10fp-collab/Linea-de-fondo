"use client";

import { useMemo, useState, useTransition } from "react";
import { weekDates, isWeekend, isSunday, formatDayLabel } from "@/lib/weekUtils";
import { CATEGORIAS_DISPONIBILIDAD, CATEGORIAS_DISPONIBILIDAD_SABADO, DIAS_SEMANA } from "@/lib/constants";
import { downloadExcel, type ExcelCellStyle } from "@/lib/excel";
import { ColorBadge } from "@/components/Badge";
import { setDisponibilidadDiaArbitro, clearDisponibilidadDiaArbitro } from "./actions";
import type { DisponibilidadDia } from "./queries";

interface TeamLite {
  id: string;
  name: string;
  color: string;
  photo_url: string | null;
}

// Mismo criterio que <DayCell> pero como texto plano, para el export.
function cellText(row: DisponibilidadDia | null, weekend: boolean): string {
  if (!weekend) return !row || row.disponible ? "Disponible" : "No disponible";
  if (!row) return "Sin responder";
  if (!row.disponible || row.categorias.length === 0) return "No disponible";
  return row.categorias.join(", ");
}

// Mismas categorías que cellText, pero una por renglón (para el Excel) y el
// color de celda que le corresponde a cada estado.
function cellExcel(row: DisponibilidadDia | null, weekend: boolean): { value: string; style: ExcelCellStyle } {
  if (!weekend) return !row || row.disponible ? { value: "Disponible", style: "good" } : { value: "No disponible", style: "bad" };
  if (!row) return { value: "Sin responder", style: "neutral" };
  if (!row.disponible || row.categorias.length === 0) return { value: "No disponible", style: "bad" };
  return { value: row.categorias.join("\n"), style: "good" };
}

const SIN_RESPONDER = "__sin_responder__";

export default function DisponibilidadMatrix({
  monday,
  referees,
  disponibilidadPorArbitro,
  teams,
  exclusionesPorArbitro,
}: {
  monday: string;
  referees: { id: string; name: string }[];
  disponibilidadPorArbitro: Record<string, DisponibilidadDia[]>;
  teams: TeamLite[];
  exclusionesPorArbitro: Record<string, string[]>;
}) {
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [editando, setEditando] = useState<{ refereeId: string; refereeName: string; fecha: string } | null>(null);
  const dates = weekDates(monday);

  const sabado = dates[5];
  const domingo = dates[6];

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = referees;
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    if (categoriaFiltro === SIN_RESPONDER) {
      list = list.filter((r) => {
        const rows = disponibilidadPorArbitro[r.id] ?? [];
        const fechasRespondidas = new Set(rows.map((row) => row.fecha));
        return !fechasRespondidas.has(sabado) || !fechasRespondidas.has(domingo);
      });
    } else if (categoriaFiltro) {
      list = list.filter((r) => {
        const rows = disponibilidadPorArbitro[r.id] ?? [];
        return rows.some((row) => isWeekend(row.fecha) && row.disponible && row.categorias.includes(categoriaFiltro));
      });
    }
    return list;
  }, [referees, q, categoriaFiltro, disponibilidadPorArbitro, sabado, domingo]);

  function exportExcel() {
    const columns = [
      { header: "Árbitro", widthPx: 200 },
      { header: "Clubes excluidos", widthPx: 200 },
      ...DIAS_SEMANA.map((d, i) => ({ header: d.label, widthPx: i >= 5 ? 220 : 110 })),
    ];
    const rows = filtered.map((r) => {
      const porFecha = new Map((disponibilidadPorArbitro[r.id] ?? []).map((d) => [d.fecha, d]));
      const excluidos = (exclusionesPorArbitro[r.id] ?? []).map((id) => teamsById.get(id)?.name).filter((n): n is string => !!n);
      return [
        { value: r.name, style: null },
        { value: excluidos.join(", "), style: null },
        ...dates.map((fecha) => cellExcel(porFecha.get(fecha) ?? null, isWeekend(fecha))),
      ];
    });
    downloadExcel(`disponibilidad_${monday}.xls`, columns, rows);
  }

  return (
    <div>
      <div className="text-[12.5px] text-text-dim mb-2.5">
        <b className="text-text font-semibold">{referees.length}</b> árbitro{referees.length === 1 ? "" : "s"} activo
        {referees.length === 1 ? "" : "s"}
        {filtered.length !== referees.length && ` · ${filtered.length} coinciden con el filtro`}
      </div>
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
          <option value={SIN_RESPONDER}>Sin responder</option>
        </select>
        <button
          onClick={exportExcel}
          className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
        >
          Exportar Excel
        </button>
      </div>

      <div className="overflow-x-auto border border-line rounded-xl">
        <table className="w-full text-[12px] border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-surface-2 text-text-dim text-[10.5px] uppercase tracking-wide">
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line whitespace-nowrap sticky left-0 bg-surface-2">
                Árbitro
              </th>
              <th className="text-left font-semibold px-2.5 py-2 border-b border-line whitespace-nowrap">Clubes excluidos</th>
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
              const excluidos = (exclusionesPorArbitro[r.id] ?? []).map((id) => teamsById.get(id)).filter((t): t is TeamLite => !!t);
              return (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="px-2.5 py-2 whitespace-nowrap font-medium sticky left-0 bg-surface">{r.name}</td>
                  <td className="px-2.5 py-2 align-top">
                    {excluidos.length === 0 ? (
                      <span className="text-text-faint">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {excluidos.map((t) => (
                          <span
                            key={t.id}
                            className="flex items-center gap-1 bg-surface-2 border border-line rounded-full pl-1 pr-2 py-0.5 text-[10.5px] whitespace-nowrap"
                          >
                            <ColorBadge name={t.name} color={t.color} photoUrl={t.photo_url} size={14} />
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {dates.map((fecha) => (
                    <td key={fecha} className="px-2.5 py-2 whitespace-nowrap align-top">
                      <button
                        type="button"
                        onClick={() => setEditando({ refereeId: r.id, refereeName: r.name, fecha })}
                        title="Editar disponibilidad"
                        className="text-left hover:bg-surface-2 rounded-md -mx-1 -my-0.5 px-1 py-0.5"
                      >
                        <DayCell row={rows.get(fecha) ?? null} weekend={isWeekend(fecha)} />
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2.5 py-4 text-text-faint text-center">
                  No hay árbitros que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <EditarDisponibilidadModal
          refereeId={editando.refereeId}
          refereeName={editando.refereeName}
          fecha={editando.fecha}
          diaLabel={DIAS_SEMANA[dates.indexOf(editando.fecha)].label}
          row={(disponibilidadPorArbitro[editando.refereeId] ?? []).find((d) => d.fecha === editando.fecha) ?? null}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

// El coordinador general puede editar la disponibilidad de cualquier árbitro
// (por ejemplo, cuando alguien no puede o no sabe cargarla solo) — mismos
// controles que el árbitro tiene para su propia disponibilidad, pero
// llamando a las acciones que aceptan un refereeId explícito.
function EditarDisponibilidadModal({
  refereeId,
  refereeName,
  fecha,
  diaLabel,
  row,
  onClose,
}: {
  refereeId: string;
  refereeName: string;
  fecha: string;
  diaLabel: string;
  row: DisponibilidadDia | null;
  onClose: () => void;
}) {
  const weekend = isWeekend(fecha);
  const disponible = row?.disponible ?? !weekend;
  const categorias = row?.categorias ?? [];
  const respondido = row !== null;
  const [isPending, startTransition] = useTransition();

  function guardar(nuevoDisponible: boolean, nuevasCategorias: string[]) {
    startTransition(async () => {
      const res = await setDisponibilidadDiaArbitro(refereeId, fecha, nuevoDisponible, nuevasCategorias);
      if (!res.ok) alert(res.error);
    });
  }

  function onToggleCategoria(cat: string) {
    const yaEsta = categorias.includes(cat);
    let nuevas: string[];
    if (yaEsta) {
      nuevas = categorias.filter((c) => c !== cat);
    } else if (cat === "FULL TIME") {
      nuevas = ["FULL TIME"];
    } else {
      nuevas = [...categorias.filter((c) => c !== "FULL TIME"), cat];
    }
    guardar(nuevas.length > 0, nuevas);
  }

  function onDesmarcarTodo() {
    startTransition(async () => {
      const res = await clearDisponibilidadDiaArbitro(refereeId, fecha);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50" onClick={onClose}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-display text-[15px] font-semibold">{refereeName}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text text-[12.5px]">
            Cerrar
          </button>
        </div>
        <p className="text-[12.5px] text-text-dim mb-3">
          {diaLabel} · {formatDayLabel(fecha)}
          {isPending && <span className="text-text-faint"> · guardando...</span>}
        </p>

        {!weekend ? (
          <div className="flex gap-2">
            <button
              onClick={() => guardar(true, [])}
              className={`text-[12.5px] font-semibold rounded-lg px-3.5 py-2 border ${
                disponible ? "bg-good-bg text-good-text border-good" : "bg-transparent text-text-dim border-line"
              }`}
            >
              Disponible
            </button>
            <button
              onClick={() => guardar(false, [])}
              className={`text-[12.5px] font-semibold rounded-lg px-3.5 py-2 border ${
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
              <input type="checkbox" checked={respondido && !disponible} onChange={() => guardar(false, [])} className="hidden" />
              NO DISPONIBLE
            </label>
            {respondido && (
              <button onClick={onDesmarcarTodo} className="text-[12px] text-text-faint hover:text-text underline px-1">
                Desmarcar todo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCell({ row, weekend }: { row: DisponibilidadDia | null; weekend: boolean }) {
  // Entre semana, sin respuesta = disponible por default (solo hay que
  // marcar cuando alguien NO puede). El fin de semana sí necesita una
  // respuesta explícita.
  if (!weekend) {
    const disponible = cellText(row, weekend) === "Disponible";
    return (
      <span
        className={`text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          disponible ? "bg-good-bg text-good-text" : "bg-bad-bg text-bad-text"
        }`}
      >
        {cellText(row, weekend)}
      </span>
    );
  }

  if (!row) {
    return <span className="text-text-faint">—</span>;
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
