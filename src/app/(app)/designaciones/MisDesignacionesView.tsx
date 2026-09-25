"use client";

import { useTransition } from "react";
import { confirmDesignacion } from "./actions";
import { money, TeamBadge, RefereeBadge } from "./DesignacionesGrid";
import PartidosExternos from "./PartidosExternos";
import { matchCtReferee, waLink, telLink } from "@/lib/constants";
import type { Companero, Confirmacion, DesignacionFull, PartidoExterno, ViaticoLocalidad } from "./queries";

export default function MisDesignacionesView({
  designaciones,
  myRefereeId,
  viaticos,
  companeros,
  confirmaciones,
  teams,
  referees,
  partidosExternos,
}: {
  designaciones: DesignacionFull[];
  myRefereeId: string;
  viaticos: ViaticoLocalidad[];
  companeros: Record<string, Companero[]>;
  confirmaciones: Record<string, Confirmacion[]>;
  teams: { id: string; name: string; color: string; photo_url: string | null }[];
  referees: { id: string; name: string; color: string; photo_url: string | null; telefono: string | null }[];
  partidosExternos: PartidoExterno[];
}) {
  const viaticoByLocalidad = new Map(viaticos.map((v) => [v.localidad, v.monto]));
  const mias = designaciones
    .map((d) => ({ d, mia: d.arbitros.find((a) => a.refereeId === myRefereeId) }))
    .filter((x): x is { d: DesignacionFull; mia: NonNullable<(typeof x)["mia"]> } => !!x.mia);

  // Partidos donde además (o en cambio) ofició de comisionado técnico —
  // solo cuenta si el nombre cargado como CT matchea con este árbitro (ver
  // matchCtReferee: por ahora, el único caso real es Zucchio).
  const comoCt = designaciones.filter((d) => d.ctNombre && d.ctMonto && matchCtReferee(referees, d.ctNombre)?.id === myRefereeId);
  const totalCt = comoCt.reduce((sum, d) => sum + (d.ctMonto ?? 0), 0);

  const total = mias.reduce((sum, x) => sum + x.mia.monto, 0) + totalCt;
  // Mismo criterio que puedeConfirmar más abajo: un partido ya jugado o
  // suspendido no tiene botón de confirmar, así que tampoco puede contar acá
  // como "pendiente" (si no, el cartel de arriba promete algo que la tarjeta
  // no deja hacer).
  const pendientes = mias.filter(
    ({ d }) =>
      d.requiereConfirmacion &&
      d.estado !== "suspendido" &&
      d.estado !== "jugado" &&
      !(confirmaciones[d.id] ?? []).some((c) => c.refereeId === myRefereeId)
  ).length;
  const suspendidos = mias.filter(({ d }) => d.estado === "suspendido");
  const montoPendienteCobro = suspendidos.reduce((sum, x) => sum + x.mia.monto, 0);

  return (
    <div>
      <div className="bg-surface-2 border border-line rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[13px] text-text-dim">
          Total del mes ({mias.length} partido{mias.length === 1 ? "" : "s"}
          {totalCt > 0 && ` + ${money.format(totalCt)} como comisionado técnico en ${comoCt.length}`})
        </span>
        {pendientes > 0 && (
          <span className="text-[12px] font-semibold text-amber-text bg-amber-bg rounded-full px-2.5 py-1">
            {pendientes} partido{pendientes === 1 ? "" : "s"} esperando tu confirmación
          </span>
        )}
        {suspendidos.length > 0 && (
          <span className="text-[12px] font-semibold text-bad-text bg-bad-bg rounded-full px-2.5 py-1">
            {suspendidos.length} suspendido{suspendidos.length === 1 ? "" : "s"} · {money.format(montoPendienteCobro)} pendiente de cobro
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
              teams={teams}
              referees={referees}
            />
          ))}
        </div>
      )}

      <PartidosExternos partidos={partidosExternos} />
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
  teams,
  referees,
}: {
  d: DesignacionFull;
  miaMonto: number;
  myRefereeId: string;
  viaticoByLocalidad: Map<string, number>;
  companeros: Companero[];
  confirmados: Confirmacion[];
  teams: { id: string; name: string; color: string; photo_url: string | null }[];
  referees: { id: string; color: string; photo_url: string | null; telefono: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const yoConfirme = confirmados.some((c) => c.refereeId === myRefereeId);
  const todosConfirmaron = d.arbitros.length > 0 && d.arbitros.every((a) => confirmados.some((c) => c.refereeId === a.refereeId));
  const puedeConfirmar = d.requiereConfirmacion && d.estado !== "suspendido" && d.estado !== "jugado";

  function onConfirmar() {
    startTransition(async () => {
      const res = await confirmDesignacion(d.id);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <div className="bg-surface border border-line rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-[14px] font-semibold m-0 flex items-center gap-1.5">
          <TeamBadge name={d.equipoLocal} teams={teams} />
          {d.equipoLocal} <span className="text-text-faint font-normal">vs</span> {d.equipoVisitante}
          <TeamBadge name={d.equipoVisitante} teams={teams} />
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
          <p className="text-[12px] text-text-dim m-0 mt-1 flex items-center gap-1 flex-wrap">
            Con
            {companeros
              .filter((c) => c.refereeId !== myRefereeId)
              .map((c, i, arr) => {
                const telefono = referees.find((r) => r.id === c.refereeId)?.telefono;
                return (
                  <span key={c.refereeId} className="flex items-center gap-1">
                    <RefereeBadge refereeId={c.refereeId} refereeName={c.refereeName} referees={referees} />
                    {c.refereeName}
                    {telefono && (
                      <>
                        <a
                          href={waLink(telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Escribirle a ${c.refereeName} por WhatsApp`}
                          className="flex-none w-[18px] h-[18px] rounded-full bg-[#25D366] text-white inline-flex items-center justify-center"
                        >
                          <WhatsAppIcon />
                        </a>
                        <a
                          href={telLink(telefono)}
                          title={`Llamar a ${c.refereeName}`}
                          className="flex-none w-[18px] h-[18px] rounded-full bg-surface-3 text-text-dim inline-flex items-center justify-center"
                        >
                          <PhoneIcon />
                        </a>
                      </>
                    )}
                    {i < arr.length - 1 && <span>y</span>}
                  </span>
                );
              })}
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
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2.5">
          <EstadoBadge estado={d.estado} />
          <span className="font-display text-[15px] font-semibold">{money.format(miaMonto)}</span>
        </div>
        {d.estado === "suspendido" && <span className="text-[10.5px] text-bad-text">Pendiente de cobro</span>}
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.13-4.9-4.32-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.04.93 1.92 1.22 2.2 1.36.28.14.44.12.6-.07.16-.19.7-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.75 1.87.89.27.14.45.21.52.32.07.12.07.65-.17 1.33z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
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
