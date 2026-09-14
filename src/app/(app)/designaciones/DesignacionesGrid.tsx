"use client";

import { useTransition } from "react";
import RefereeCombobox from "@/components/RefereeCombobox";
import { deleteDesignacion, setDesignacionArbitro, setDesignacionCt, setDesignacionEstado, setDesignacionNotas } from "./actions";
import type { DesignacionEstado } from "@/lib/database.types";
import type { Confirmacion, DesignacionFull } from "./queries";

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

export default function DesignacionesGrid({
  designaciones,
  referees,
  onEdit,
  sortOrder,
  onToggleSort,
  confirmaciones,
}: {
  designaciones: DesignacionFull[];
  referees: { id: string; name: string }[];
  onEdit: (d: DesignacionFull) => void;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
  confirmaciones: Record<string, Confirmacion[]>;
}) {
  if (designaciones.length === 0) {
    return <p className="text-[12.5px] text-text-faint m-0">No hay designaciones para este mes con ese filtro.</p>;
  }

  return (
    <div className="overflow-x-auto border border-line rounded-xl">
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
          {designaciones.map((d) => (
            <DesignacionRow key={d.id} d={d} referees={referees} onEdit={onEdit} confirmados={confirmaciones[d.id] ?? []} />
          ))}
        </tbody>
      </table>
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
}: {
  d: DesignacionFull;
  referees: { id: string; name: string }[];
  onEdit: (d: DesignacionFull) => void;
  confirmados: Confirmacion[];
}) {
  const [isPending, startTransition] = useTransition();

  function onArbitroChange(posicion: 1 | 2 | 3, refereeId: string) {
    startTransition(async () => {
      await setDesignacionArbitro(d.id, posicion, refereeId || null);
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
        {d.requiereConfirmacion && d.arbitros.length > 0 && (
          <div
            className={`text-[10.5px] mt-1 ${
              d.arbitros.every((a) => confirmados.some((c) => c.refereeId === a.refereeId)) ? "text-good-text" : "text-text-faint"
            }`}
          >
            {confirmados.length}/{d.arbitros.length} confirmaron
          </div>
        )}
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
