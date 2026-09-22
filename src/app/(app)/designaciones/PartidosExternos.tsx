"use client";

import { useState, useTransition } from "react";
import { money } from "./DesignacionesGrid";
import { deletePartidoExterno } from "./actions";
import PartidoExternoFormModal from "./PartidoExternoFormModal";
import type { PartidoExterno } from "./queries";

// Partidos que el árbitro dirigió por fuera del circuito de designaciones de
// esta liga (otro torneo/asociación), cargados por él mismo. Es un registro
// aparte y personal, a propósito no se mezcla con el total "oficial" de
// arriba — ese es el que se usa para el pago real.
export default function PartidosExternos({ partidos }: { partidos: PartidoExterno[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PartidoExterno | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = partidos.reduce((sum, p) => sum + p.monto, 0);

  function onDelete(p: PartidoExterno) {
    if (!confirm(`¿Eliminar "${p.descripcion}"?`)) return;
    startTransition(async () => {
      await deletePartidoExterno(p.id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="font-display text-[16px] font-semibold m-0">Otros partidos (fuera de la liga)</h3>
          <p className="text-[11.5px] text-text-faint m-0 mt-0.5">
            Partidos de otros torneos o asociaciones que cargás vos, para tener todo en un solo lugar. No afecta el total
            de arriba.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3.5 py-2 whitespace-nowrap"
        >
          + Agregar partido
        </button>
      </div>

      {partidos.length === 0 ? (
        <p className="text-[12.5px] text-text-faint m-0">Todavía no cargaste ningún partido externo este mes.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-2.5">
            {partidos.map((p) => (
              <div
                key={p.id}
                className={`bg-surface border border-line rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap ${
                  isPending ? "opacity-70" : ""
                }`}
              >
                <div>
                  <p className="text-[14px] font-semibold m-0">{p.descripcion}</p>
                  <p className="text-[12px] text-text-dim m-0 mt-0.5">
                    {new Date(p.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    {p.hora ? ` · ${p.hora.slice(0, 5)}` : ""}
                    {[p.competencia, p.categoria].filter(Boolean).length > 0 && ` · ${[p.competencia, p.categoria].filter(Boolean).join(" · ")}`}
                  </p>
                  {p.notas && <p className="text-[12px] text-text-faint m-0 mt-1">{p.notas}</p>}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-[15px] font-semibold">{money.format(p.monto)}</span>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    title="Editar"
                    className="text-text-faint hover:text-text p-1 rounded-md"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    title="Eliminar"
                    className="text-text-faint hover:text-bad-text p-1 rounded-md"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-text-dim m-0">
            Subtotal externos ({partidos.length} partido{partidos.length === 1 ? "" : "s"}):{" "}
            <b className="text-text">{money.format(total)}</b>
          </p>
        </>
      )}

      {(showForm || editing) && (
        <PartidoExternoFormModal
          partido={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
