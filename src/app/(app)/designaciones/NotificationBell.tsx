"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { marcarNotificacionesVistas } from "./actions";
import { TeamBadge } from "./DesignacionesGrid";
import type { ConfirmacionEvento } from "./queries";

// Campana de "Fulano confirmó su partido" para coordinador/instructor. Vive
// solo en el cliente y en la grilla (no manda push al celular — para eso ya
// existe el aviso al árbitro cuando lo designan, esto es al revés: que el
// coordinador se entere sin tener que revisar partido por partido).
function tiempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

export default function NotificationBell({
  eventos,
  seenAt,
  teams,
}: {
  eventos: ConfirmacionEvento[];
  seenAt: string | null;
  teams: { name: string; color: string; photo_url: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [localSeenAt, setLocalSeenAt] = useState(seenAt);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const sinVer = eventos.filter((e) => !localSeenAt || e.confirmedAt > localSeenAt).length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && sinVer > 0) {
      setLocalSeenAt(new Date().toISOString());
      startTransition(() => {
        marcarNotificacionesVistas();
      });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative bg-transparent text-text-dim hover:text-text border border-line rounded-lg w-10 h-10 flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {sinVer > 0 && (
          <span className="absolute -top-1 -right-1 bg-bad text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {sinVer > 9 ? "9+" : sinVer}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-h-[420px] overflow-y-auto bg-surface border border-line rounded-xl shadow-lg z-50 py-1.5">
          <div className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">Confirmaciones de árbitros</div>
          {eventos.length === 0 ? (
            <p className="text-[12.5px] text-text-faint px-3.5 py-3 m-0">Todavía no hay confirmaciones.</p>
          ) : (
            eventos.map((e) => (
              <div key={`${e.designacionId}-${e.refereeId}`} className="px-3.5 py-2.5 border-t border-line first:border-t-0">
                <p className="text-[12.5px] m-0">
                  <b>{e.refereeName}</b> confirmó su partido
                </p>
                <p className="text-[12px] text-text-dim m-0 mt-1 flex items-center gap-1">
                  <TeamBadge name={e.equipoLocal} teams={teams} />
                  {e.equipoLocal} <span className="text-text-faint">vs</span> {e.equipoVisitante}
                  <TeamBadge name={e.equipoVisitante} teams={teams} />
                </p>
                <p className="text-[10.5px] text-text-faint m-0 mt-1">{tiempoRelativo(e.confirmedAt)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
