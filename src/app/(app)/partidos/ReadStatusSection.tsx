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

export default function ReadStatusSection({
  partido,
  reads,
  isArbitro,
  myRefereeId,
}: {
  partido: PartidoFull;
  reads: ReadConfirmation[];
  isArbitro: boolean;
  myRefereeId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!partido.finalizedAt) return null;

  if (isArbitro) {
    if (!myRefereeId || !partido.referees.some((r) => r.id === myRefereeId)) return null;
    const myRead = reads.find((r) => r.refereeId === myRefereeId);

    return (
      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-3 my-4">
        {myRead ? (
          <p className="text-[12.5px] text-relevant-text m-0 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Confirmaste que viste este informe el {formatConfirmedAt(myRead.confirmedAt)}.
          </p>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12.5px] text-text-dim m-0">
                Confirmá que revisaste el informe de este partido.
              </p>
              <button
                disabled={isPending}
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
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg font-semibold text-[13px] px-3.5 py-2"
              >
                Confirmar que vi este informe
              </button>
            </div>
            {error && <p className="text-bad-text text-[12px] mt-2 mb-0">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  // Coordinador / Instructor: estado de lectura por árbitro asignado.
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
          const read = reads.find((r) => r.refereeId === ref.id);
          return (
            <div key={ref.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="text-text-dim">{ref.name}</span>
              {read ? (
                <span className="text-relevant-text">Visto el {formatConfirmedAt(read.confirmedAt)}</span>
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
