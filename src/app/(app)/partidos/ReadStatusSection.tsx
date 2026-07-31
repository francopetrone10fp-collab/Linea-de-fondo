"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmPartidoRead } from "./actions";
import type { PartidoFull, ReadConfirmation } from "./queries";

function formatConfirmedAt(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function vezLabel(n: number) {
  return n === 1 ? "vez" : "veces";
}

export default function ReadStatusSection({
  partido,
  reads,
  myRefereeId,
  totalClips,
  viewedCount,
}: {
  partido: PartidoFull;
  reads: ReadConfirmation[];
  myRefereeId: string | null;
  totalClips: number;
  viewedCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!partido.finalizedAt) return null;

  // No depende del rol del perfil: el que ve su propio recordatorio de
  // confirmación es quien esté asignado como árbitro a ESTE partido puntual
  // (puede ser Coordinador o Instructor arbitrando).
  const isAssignedReferee = !!myRefereeId && partido.referees.some((r) => r.id === myRefereeId);

  if (isAssignedReferee) {
    // reads viene ordenado de más viejo a más nuevo (fetchReadsForPartido).
    const myReads = reads.filter((r) => r.refereeId === myRefereeId);
    const hasConfirmedBefore = myReads.length > 0;
    const lastRead = myReads[myReads.length - 1];
    const missingClips = totalClips - viewedCount;
    const canConfirmNow = hasConfirmedBefore || missingClips <= 0;

    return (
      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-3 my-4">
        <div className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-dim mb-2">
          Confirmación de lectura del informe
        </div>
        {hasConfirmedBefore ? (
          <p className="text-[12.5px] text-relevant-text m-0 mb-2.5 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Confirmaste {myReads.length} {vezLabel(myReads.length)} que viste este informe — la última el{" "}
            {formatConfirmedAt(lastRead.confirmedAt)}.
          </p>
        ) : (
          totalClips > 0 && (
            <p className="text-[12.5px] text-text-dim m-0 mb-2.5">
              Viste {viewedCount} de {totalClips} clips
              {missingClips > 0 ? " — mirá todos para poder confirmar." : "."}
            </p>
          )
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12.5px] text-text-dim m-0">
            {hasConfirmedBefore
              ? "¿Volviste a repasar este informe? Confirmalo de nuevo."
              : "Confirmá que revisaste el informe de este partido."}
          </p>
          <button
            disabled={isPending || !canConfirmNow}
            title={!canConfirmNow ? `Te faltan ${missingClips} clip${missingClips === 1 ? "" : "s"} por ver` : undefined}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await confirmPartidoRead(partido.id);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                router.refresh();
              })
            }
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-accent-ink rounded-lg font-semibold text-[13px] px-3.5 py-2"
          >
            {hasConfirmedBefore ? "Confirmar de nuevo que vi este informe" : "Confirmar que vi este informe"}
          </button>
        </div>
        {error && <p className="text-bad-text text-[12px] mt-2 mb-0">{error}</p>}
      </div>
    );
  }

  // No es uno de los árbitros asignados a este partido: ve el historial de
  // confirmaciones de la terna en vez de su propio recordatorio.
  if (partido.referees.length === 0) return null;
  const confirmedCount = partido.referees.filter((r) => reads.some((rd) => rd.refereeId === r.id)).length;

  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-3.5 my-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-dim">
          Confirmación de lectura del informe
        </span>
        <span className="text-[11.5px] font-semibold text-text-dim bg-surface-2 px-2 py-0.5 rounded-full">
          {confirmedCount}/{partido.referees.length} lo vieron
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {partido.referees.map((ref) => {
          const refReads = reads.filter((r) => r.refereeId === ref.id);
          const count = refReads.length;
          const lastRefRead = refReads[refReads.length - 1];
          return (
            <div key={ref.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="text-text-dim">{ref.name}</span>
              {count > 0 ? (
                <span className="text-relevant-text">
                  Confirmó {count} {vezLabel(count)}, última el {formatShortDate(lastRefRead.confirmedAt)}
                </span>
              ) : (
                <span className="text-text-faint">No visto todavía</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
