"use client";

import { useTransition } from "react";
import { confirmDesignacion } from "./actions";
import { money } from "./DesignacionesGrid";
import type { Companero, Confirmacion, DesignacionFull, ViaticoLocalidad } from "./queries";

export default function MisDesignacionesView({
  designaciones,
  myRefereeId,
  viaticos,
  companeros,
  confirmaciones,
}: {
  designaciones: DesignacionFull[];
  myRefereeId: string;
  viaticos: ViaticoLocalidad[];
  companeros: Record<string, Companero[]>;
  confirmaciones: Record<string, Confirmacion[]>;
}) {
  const viaticoByLocalidad = new Map(viaticos.map((v) => [v.localidad, v.monto]));
  const mias = designaciones
    .map((d) => ({ d, mia: d.arbitros.find((a) => a.refereeId === myRefereeId) }))
    .filter((x): x is { d: DesignacionFull; mia: NonNullable<(typeof x)["mia"]> } => !!x.mia);

  const total = mias.reduce((sum, x) => sum + x.mia.monto, 0);
  const pendientes = mias.filter(
    ({ d }) => d.requiereConfirmacion && !(confirmaciones[d.id] ?? []).some((c) => c.refereeId === myRefereeId)
  ).length;

  return (
    <div>
      <div className="bg-surface-2 border border-line rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[13px] text-text-dim">Total del mes ({mias.length} partido{mias.length === 1 ? "" : "s"})</span>
        {pendientes > 0 && (
          <span className="text-[12px] font-semibold text-amber-text bg-amber-bg rounded-full px-2.5 py-1">
            {pendientes} partido{pendientes === 1 ? "" : "s"} esperando tu confirmación
          </span>
        )}
        <span className="font-display text-[19px] font-semibold">{money.format(total)}</span>
      </div>

      {mias.length === 0 ? (
        <p className="text-[12.5px] text-text-faint m-0">Todavía no tenés designaciones cargadas para este mes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mias.map(({ d, mia }) => (
            <DesignacionCard
              key={d.id}
              d={d}
              miaMonto={mia.monto}
              myRefereeId={myRefereeId}
              viaticoByLocalidad={viaticoByLocalidad}
              companeros={companeros[d.id] ?? []}
              confirmados={confirmaciones[d.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DesignacionCard({
  d,
  miaMonto,
  myRefereeId,
  viaticoByLocalidad,
  companeros,
  confirmados,
}: {
  d: DesignacionFull;
  miaMonto: number;
  myRefereeId: string;
  viaticoByLocalidad: Map<string, number>;
  companeros: Companero[];
  confirmados: Confirmacion[];
}) {
  const [isPending, startTransition] = useTransition();
  const yoConfirme = confirmados.some((c) => c.refereeId === myRefereeId);
  const todosConfirmaron = d.arbitros.length > 0 && d.arbitros.every((a) => confirmados.some((c) => c.refereeId === a.refereeId));
  const puedeConfirmar = d.requiereConfirmacion && d.estado !== "suspendido" && d.estado !== "jugado";

  function onConfirmar() {
    startTransition(async () => {
      await confirmDesignacion(d.id);
    });
  }

  return (
    <div className="bg-surface border border-line rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-[14px] font-semibold m-0">
          {d.equipoLocal} <span className="text-text-faint font-normal">vs</span> {d.equipoVisitante}
        </p>
        <p className="text-[12px] text-text-dim m-0 mt-0.5">
          {d.fecha
            ? new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "Sin fecha"}
          {d.hora ? ` · ${d.hora.slice(0, 5)}` : ""} · {d.categoria}
          {d.sede ? ` · ${d.sede}` : ""}
        </p>
        {d.notas && (
          <p className="text-[12.5px] text-amber-text bg-amber-bg rounded-md px-2 py-1 m-0 mt-1.5 inline-block">{d.notas}</p>
        )}
        {d.localidad && viaticoByLocalidad.has(d.localidad) && (
          <p className="text-[11px] text-text-faint m-0 mt-0.5">
            Viático en cancha ({d.localidad}): {money.format(viaticoByLocalidad.get(d.localidad)!)} — se cobra aparte, en
            efectivo, no está incluido en el monto de al lado.
          </p>
        )}
        {companeros.filter((c) => c.refereeId !== myRefereeId).length > 0 && (
          <p className="text-[12px] text-text-dim m-0 mt-1">
            Con {companeros.filter((c) => c.refereeId !== myRefereeId).map((c) => c.refereeName).join(" y ")}
          </p>
        )}
        {puedeConfirmar && (
          <div className="mt-2">
            {yoConfirme ? (
              <span className="text-[12px] text-good-text">✓ Ya confirmaste{!todosConfirmaron && " · esperando a tu compañero"}</span>
            ) : (
              <button
                onClick={onConfirmar}
                disabled={isPending}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[12px] px-3 py-1.5"
              >
                Confirmar partido
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <EstadoBadge estado={d.estado} />
        <span className="font-display text-[15px] font-semibold">{money.format(miaMonto)}</span>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: DesignacionFull["estado"] }) {
  const style =
    estado === "suspendido"
      ? "bg-bad-bg text-bad-text"
      : estado === "confirmar"
        ? "bg-amber-bg text-amber-text"
        : estado === "jugado" || estado === "confirmado"
          ? "bg-good-bg text-good-text"
          : "bg-surface-3 text-text-dim";
  const label = {
    programado: "Programado",
    confirmar: "A confirmar",
    suspendido: "Suspendido",
    jugado: "Jugado",
    confirmado: "Confirmado",
  }[estado];
  return <span className={`text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${style}`}>{label}</span>;
}
