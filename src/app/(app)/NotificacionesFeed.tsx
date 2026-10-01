"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { TeamBadge } from "./designaciones/DesignacionesGrid";
import { marcarNotificacionesHomeVistas } from "./profile-actions";
import { truncateText } from "@/lib/constants";
import type { ConfirmacionEvento } from "./designaciones/queries";
import type { ComentarioEvento } from "./partidos/queries";

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

type Evento =
  | { kind: "confirmacion"; at: string; data: ConfirmacionEvento }
  | { kind: "comentario"; at: string; data: ComentarioEvento };

// Campanita de notificaciones en Inicio (coordinador/instructor):
// confirmaciones de árbitros en sus designaciones + comentarios que dejan en
// partidos/clips de Evaluaciones. Antes vivía solo adentro de Designaciones
// y no incluía comentarios.
export default function NotificacionesFeed({
  confirmaciones,
  comentarios,
  teams,
  seenAt,
}: {
  confirmaciones: ConfirmacionEvento[];
  comentarios: ComentarioEvento[];
  teams: { name: string; color: string; photo_url: string | null }[];
  seenAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [localSeenAt, setLocalSeenAt] = useState(seenAt);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const eventos = useMemo<Evento[]>(() => {
    const list: Evento[] = [
      ...confirmaciones.map((c): Evento => ({ kind: "confirmacion", at: c.confirmedAt, data: c })),
      ...comentarios.map((c): Evento => ({ kind: "comentario", at: c.createdAt, data: c })),
    ];
    list.sort((a, b) => (a.at < b.at ? 1 : -1));
    return list.slice(0, 20);
  }, [confirmaciones, comentarios]);

  const sinVer = eventos.filter((e) => !localSeenAt || e.at > localSeenAt).length;

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
        marcarNotificacionesHomeVistas();
      });
    }
  }

  return (
    <div className="relative flex-none" ref={ref}>
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
        <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] max-h-[420px] overflow-y-auto bg-surface border border-line rounded-xl shadow-lg z-50 py-1.5">
          <div className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">Notificaciones</div>
          {eventos.length === 0 ? (
            <p className="text-[12.5px] text-text-faint px-3.5 py-3 m-0">Todavía no hay notificaciones.</p>
          ) : (
            eventos.map((e) =>
              e.kind === "confirmacion" ? (
                <ConfirmacionRow key={`c-${e.data.designacionId}-${e.data.refereeId}`} evento={e.data} teams={teams} onNavigate={() => setOpen(false)} />
              ) : (
                <ComentarioRow key={`k-${e.data.id}`} evento={e.data} teams={teams} onNavigate={() => setOpen(false)} />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmacionRow({
  evento,
  teams,
  onNavigate,
}: {
  evento: ConfirmacionEvento;
  teams: { name: string; color: string; photo_url: string | null }[];
  onNavigate: () => void;
}) {
  const href = evento.fecha ? `/designaciones?month=${evento.fecha.slice(0, 7)}` : "/designaciones";
  return (
    <Link href={href} onClick={onNavigate} className="block px-3.5 py-2.5 border-t border-line first:border-t-0 hover:bg-surface-2">
      <p className="text-[12.5px] m-0">
        <b>{evento.refereeName}</b> confirmó su partido
      </p>
      <p className="text-[12px] text-text-dim m-0 mt-1 flex items-center gap-1 flex-wrap">
        <TeamBadge name={evento.equipoLocal} teams={teams} />
        {evento.equipoLocal} <span className="text-text-faint">vs</span> {evento.equipoVisitante}
        <TeamBadge name={evento.equipoVisitante} teams={teams} />
      </p>
      <p className="text-[10.5px] text-text-faint m-0 mt-1">{tiempoRelativo(evento.confirmedAt)}</p>
    </Link>
  );
}

function ComentarioRow({
  evento,
  teams,
  onNavigate,
}: {
  evento: ComentarioEvento;
  teams: { name: string; color: string; photo_url: string | null }[];
  onNavigate: () => void;
}) {
  const href = `/competitions/${encodeURIComponent(evento.competitionSlug)}/${encodeURIComponent(evento.temporada)}/${evento.partidoId}`;
  return (
    <Link href={href} onClick={onNavigate} className="block px-3.5 py-2.5 border-t border-line first:border-t-0 hover:bg-surface-2">
      <p className="text-[12.5px] m-0">
        <b>{evento.authorName}</b> comentó {evento.clipTitle ? `en "${truncateText(evento.clipTitle, 30)}"` : "en el partido"}
      </p>
      <p className="text-[12px] text-text-dim m-0 mt-1 flex items-center gap-1 flex-wrap">
        <TeamBadge name={evento.equipoLocal} teams={teams} />
        {evento.equipoLocal} <span className="text-text-faint">vs</span> {evento.equipoVisitante}
        <TeamBadge name={evento.equipoVisitante} teams={teams} />
      </p>
      <p className="text-[12px] m-0 mt-1 italic text-text-dim">&quot;{truncateText(evento.text, 90)}&quot;</p>
      <p className="text-[10.5px] text-text-faint m-0 mt-1">{tiempoRelativo(evento.createdAt)}</p>
    </Link>
  );
}
