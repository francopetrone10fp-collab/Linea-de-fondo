"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import RefereeCombobox from "@/components/RefereeCombobox";
import { deleteDesignacion, setDesignacionArbitro, setDesignacionCt, setDesignacionEstado, setDesignacionNotas } from "./actions";
import { disponibilidadBlockReason } from "@/lib/constants";
import type { DesignacionEstado } from "@/lib/database.types";
import type { Confirmacion, DesignacionFull } from "./queries";
import type { DisponibilidadDia } from "../disponibilidad/queries";

const ESTADO_LABELS: Record<DesignacionEstado, string> = {
  programado: "Programado",
  confirmar: "A confirmar",
  suspendido: "Suspendido",
  jugado: "Jugado",
  confirmado: "Confirmado",
};

const ESTADO_STYLES: Record<DesignacionEstado, string> = {
  programado: "bg-surface-3 text-text-dim",
  confirmar: "bg-amber-bg text-amber-text",
  suspendido: "bg-bad-bg text-bad-text",
  jugado: "bg-good-bg text-good-text",
  confirmado: "bg-good-bg text-good-text",
};

export const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function formatDiaMes(fecha: string): string {
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

export default function DesignacionesGrid({
  designaciones,
  referees,
  onEdit,
  sortOrder,
  onToggleSort,
  confirmaciones,
  pendingIds,
  assignmentsByReferee,
  disponibilidadPorArbitro,
}: {
  designaciones: DesignacionFull[];
  referees: { id: string; name: string }[];
  onEdit: (d: DesignacionFull) => void;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
  confirmaciones: Record<string, Confirmacion[]>;
  pendingIds: Set<string>;
  assignmentsByReferee: Map<string, { fecha: string; hora: string | null; designacionId: string }[]>;
  disponibilidadPorArbitro: Record<string, DisponibilidadDia[]>;
}) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    function updateWidth() {
      if (tableWrapRef.current) setScrollWidth(tableWrapRef.current.scrollWidth);
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [designaciones]);

  function syncFromTop() {
    if (topScrollRef.current && tableWrapRef.current) tableWrapRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  }
  function syncFromTable() {
    if (topScrollRef.current && tableWrapRef.current) topScrollRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
  }

  if (designaciones.length === 0) {
    return <p className="text-[12.5px] text-text-faint m-0">No hay designaciones para este mes con ese filtro.</p>;
  }

  return (
    <div>
      {/* Barra de scroll horizontal arriba, sincronizada con la de la tabla,
          para no tener que bajar hasta el final de una lista larga para
          moverse a los costados. */}
      <div ref={topScrollRef} onScroll={syncFromTop} className="overflow-x-auto overflow-y-hidden" style={{ height: 14 }}>
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div ref={tableWrapRef} onScroll={syncFromTable} className="overflow-x-auto border border-line rounded-xl">
        <table className="w-full text-[12.5px] border-collapse min-w-[1200px]">
        <thead>
          <tr className="bg-surface-2 text-text-dim text-[11px] uppercase tracking-wide">
            <th className="text-left font-semibold px-2.5 py-2 border-b border-line whitespace-nowrap">
              <button onClick={onToggleSort} className="flex items-center gap-1 text-text-dim hover:text-text uppercase text-[11px] font-semibold">
                Día / hora
                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
              </button>
            </th>
            <Th>Jornada</Th>
            <Th>Categoría</Th>
            <Th>Competencia / rama</Th>
            <Th>Local vs Visitante</Th>
            <Th>Sede</Th>
            <Th>Estado</Th>
            <Th>Árbitro 1</Th>
            <Th>Árbitro 2</Th>
            <Th>Árbitro 3</Th>
            <Th>Comisionado técnico</Th>
            <Th>Observaciones</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {designaciones.map((d, i) => {
            const esPendiente = pendingIds.has(d.id);
            const anteriorEraPendiente = i > 0 && pendingIds.has(designaciones[i - 1].id);
            const mostrarDivisor = i > 0 && anteriorEraPendiente && !esPendiente;
            return (
              <Fragment key={d.id}>
                {mostrarDivisor && (
                  <tr>
                    <td colSpan={13} className="bg-surface-2 text-text-faint text-[10.5px] uppercase tracking-wide px-2.5 py-1.5 border-b border-line">
                      Confirmados
                    </td>
                  </tr>
                )}
                <DesignacionRow
                  d={d}
                  referees={referees}
                  onEdit={onEdit}
                  confirmados={confirmaciones[d.id] ?? []}
                  {...(() => {
                    const disabledMap = new Map<string, string>();
                    const infoMap = new Map<string, string>();
                    // Disponibilidad: el árbitro marcó que no puede ese día, o
                    // (fin de semana) marcó otras categorías pero no esta.
                    if (d.fecha) {
                      for (const r of referees) {
                        const fila = (disponibilidadPorArbitro[r.id] ?? []).find((x) => x.fecha === d.fecha);
                        const motivo = disponibilidadBlockReason(fila ?? null, d.fecha, d.categoria);
                        if (motivo) disabledMap.set(r.id, motivo);
                      }
                    }
                    if (d.fecha) {
                      for (const [refereeId, rows] of assignmentsByReferee) {
                        const otros = rows.filter((r) => r.designacionId !== d.id);
                        if (otros.length === 0) continue;
                        // Solo se bloquea el choque exacto de día Y horario — en
                        // un mismo día se puede dirigir varios partidos seguidos
                        // (ej: categorías de inferiores). El resto queda como
                        // aviso informativo, sin impedir la designación.
                        const mismaHora = d.hora && otros.some((r) => r.fecha === d.fecha && r.hora === d.hora);
                        if (mismaHora) {
                          disabledMap.set(refereeId, "Ya está designado a esa hora en otro partido.");
                          continue;
                        }
                        const mismoDiaOtraHora = otros.filter((r) => r.fecha === d.fecha);
                        if (mismoDiaOtraHora.length > 0) {
                          infoMap.set(
                            refereeId,
                            mismoDiaOtraHora.length === 1
                              ? "Ya tiene otro partido asignado ese mismo día."
                              : `Ya tiene otros ${mismoDiaOtraHora.length} partidos asignados ese mismo día.`
                          );
                        } else if (otros.length === 1) {
                          infoMap.set(refereeId, `Ya tiene un partido asignado el ${formatDiaMes(otros[0].fecha)}.`);
                        } else {
                          infoMap.set(refereeId, `Ya tiene ${otros.length} partidos asignados en otras fechas.`);
                        }
                      }
                    }
                    return { disabled: disabledMap, info: infoMap };
                  })()}
                />
              </Fragment>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left font-semibold px-2.5 py-2 border-b border-line whitespace-nowrap">{children}</th>;
}

function DesignacionRow({
  d,
  referees,
  onEdit,
  confirmados,
  disabled,
  info,
}: {
  d: DesignacionFull;
  referees: { id: string; name: string }[];
  onEdit: (d: DesignacionFull) => void;
  confirmados: Confirmacion[];
  disabled?: Map<string, string>;
  info?: Map<string, string>;
}) {
  const [isPending, startTransition] = useTransition();

  function onArbitroChange(posicion: 1 | 2 | 3, refereeId: string) {
    startTransition(async () => {
      const res = await setDesignacionArbitro(d.id, posicion, refereeId || null);
      if (!res.ok) alert(res.error);
    });
  }

  function onEstadoChange(estado: DesignacionEstado) {
    startTransition(async () => {
      await setDesignacionEstado(d.id, estado);
    });
  }

  function onCtBlur(value: string) {
    if (value === (d.ctNombre ?? "")) return;
    startTransition(async () => {
      await setDesignacionCt(d.id, value);
    });
  }

  function onNotasBlur(value: string) {
    if (value === (d.notas ?? "")) return;
    startTransition(async () => {
      await setDesignacionNotas(d.id, value);
    });
  }

  function onDelete() {
    if (!confirm("¿Eliminar esta designación?")) return;
    startTransition(async () => {
      await deleteDesignacion(d.id);
    });
  }

  const arbitro = (posicion: number) => d.arbitros.find((a) => a.posicion === posicion)?.refereeId ?? "";

  return (
    <tr className={`border-b border-line last:border-b-0 ${isPending ? "opacity-60" : ""}`}>
      <td className="px-2.5 py-2 whitespace-nowrap">
        {d.fecha ? new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—"}
        {d.hora ? ` · ${d.hora.slice(0, 5)}` : ""}
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap text-text-dim">{d.jornada || "—"}</td>
      <td className="px-2.5 py-2 whitespace-nowrap">{d.categoria}</td>
      <td className="px-2.5 py-2 whitespace-nowrap text-text-dim">
        {[d.competencia, d.rama === "masculino" ? "Masc." : d.rama === "femenino" ? "Fem." : null].filter(Boolean).join(" · ") || "—"}
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap font-medium">
        {d.equipoLocal} <span className="text-text-faint font-normal">vs</span> {d.equipoVisitante}
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap text-text-dim">{d.sede || "—"}</td>
      <td className="px-2.5 py-2 whitespace-nowrap">
        <select
          value={d.estado}
          onChange={(e) => onEstadoChange(e.target.value as DesignacionEstado)}
          className={`text-[11px] font-semibold rounded-full px-2 py-1 border-0 ${ESTADO_STYLES[d.estado]}`}
        >
          {Object.entries(ESTADO_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {d.requiereConfirmacion &&
          d.arbitros.length > 0 &&
          d.estado !== "suspendido" &&
          d.estado !== "jugado" &&
          (() => {
            const total = d.arbitros.length;
            const confirmadosArb = d.arbitros.filter((a) => confirmados.some((c) => c.refereeId === a.refereeId));
            const pendientesArb = d.arbitros.filter((a) => !confirmados.some((c) => c.refereeId === a.refereeId));
            const confirmadosCount = confirmadosArb.length;
            const color = confirmadosCount === 0 ? "bg-bad" : confirmadosCount === total ? "bg-good" : "bg-amber";
            return (
              <div className="mt-1 max-w-[150px]">
                <div className="flex items-center gap-1.5" title={`${confirmadosCount}/${total} confirmaron`}>
                  <span className={`inline-block w-2 h-2 rounded-full flex-none ${color}`} />
                  <span className="text-[10.5px] text-text-faint whitespace-nowrap">
                    {confirmadosCount}/{total} confirmaron
                  </span>
                </div>
                {pendientesArb.length > 0 && (
                  <div className="text-[10px] leading-tight mt-0.5">
                    {confirmadosArb.length > 0 && (
                      <div className="text-good-text">✓ {confirmadosArb.map((a) => a.refereeName).join(", ")}</div>
                    )}
                    <div className="text-amber-text">Falta: {pendientesArb.map((a) => a.refereeName).join(", ")}</div>
                  </div>
                )}
              </div>
            );
          })()}
      </td>
      {[1, 2, 3].map((posicion) => (
        <td key={posicion} className="px-2.5 py-2 whitespace-nowrap">
          <RefereeCombobox
            key={arbitro(posicion)}
            listId={`arb-${d.id}-${posicion}`}
            referees={referees}
            value={arbitro(posicion)}
            onChange={(refereeId) => onArbitroChange(posicion as 1 | 2 | 3, refereeId)}
            className="min-w-[130px]"
            disabled={disabled}
            info={info}
          />
          {arbitro(posicion) && (
            <div className="text-[10.5px] text-text-faint mt-0.5">
              {money.format(d.arbitros.find((a) => a.posicion === posicion)?.monto ?? 0)}
            </div>
          )}
        </td>
      ))}
      <td className="px-2.5 py-2 whitespace-nowrap">
        <input
          key={`ct-${d.id}-${d.ctNombre ?? ""}`}
          type="text"
          defaultValue={d.ctNombre ?? ""}
          onBlur={(e) => onCtBlur(e.target.value)}
          placeholder="Nombre"
          className="min-w-[110px]"
        />
        {d.ctNombre && d.ctMonto != null && <div className="text-[10.5px] text-text-faint mt-0.5">{money.format(d.ctMonto)}</div>}
      </td>
      <td className="px-2.5 py-2">
        <input
          key={`notas-${d.id}-${d.notas ?? ""}`}
          type="text"
          defaultValue={d.notas ?? ""}
          onBlur={(e) => onNotasBlur(e.target.value)}
          placeholder="Observaciones..."
          className="min-w-[160px]"
        />
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap">
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(d)}
            title="Editar"
            className="text-text-faint hover:text-text hover:bg-surface-2 p-1 rounded-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
