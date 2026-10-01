"use client";

import { useEffect, useMemo, useTransition } from "react";
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

// Feed de notificaciones de Inicio (coordinador/instructor): confirmaciones
// de árbitros en sus designaciones + comentarios que dejan en partidos/clips
// de Evaluaciones. Antes vivía como campanita adentro de Designaciones y no
// incluía comentarios — ahora está acá, a la vista apenas entrás.
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
  const [, startTransition] = useTransition();

  const eventos = useMemo<Evento[]>(() => {
    const list: Evento[] = [
      ...confirmaciones.map((c): Evento => ({ kind: "confirmacion", at: c.confirmedAt, data: c })),
      ...comentarios.map((c): Evento => ({ kind: "comentario", at: c.createdAt, data: c })),
    ];
    list.sort((a, b) => (a.at < b.at ? 1 : -1));
    return list.slice(0, 15);
  }, [confirmaciones, comentarios]);

  // El conteo de "sin ver" se calcula contra el seenAt que vino del server:
  // se actualiza recién en la próxima carga de la página (como la campanita
  // anterior), no desaparece a mitad de esta misma visita.
  const sinVer = eventos.filter((e) => !seenAt || e.at > seenAt).length;

  useEffect(() => {
    if (sinVer === 0) return;
    startTransition(() => {
      marcarNotificacionesHomeVistas();
    });
    // Solo queremos marcar como vistas una vez, al entrar con novedades —
    // no cada vez que cambia `eventos` por una revalidación de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (eventos.length === 0) return null;

  return (
    <div className="bg-surface border border-line rounded-xl mb-6 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-line flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">Notificaciones</span>
        {sinVer > 0 && (
          <span className="bg-bad text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {sinVer > 9 ? "9+" : sinVer}
          </span>
        )}
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {eventos.map((e) =>
          e.kind === "confirmacion" ? (
            <ConfirmacionRow key={`c-${e.data.designacionId}-${e.data.refereeId}`} evento={e.data} teams={teams} />
          ) : (
            <ComentarioRow key={`k-${e.data.id}`} evento={e.data} teams={teams} />
          )
        )}
      </div>
    </div>
  );
}

function ConfirmacionRow({ evento, teams }: { evento: ConfirmacionEvento; teams: { name: string; color: string; photo_url: string | null }[] }) {
  const href = evento.fecha ? `/designaciones?month=${evento.fecha.slice(0, 7)}` : "/designaciones";
  return (
    <Link href={href} className="block px-3.5 py-2.5 border-t border-line first:border-t-0 hover:bg-surface-2">
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

function ComentarioRow({ evento, teams }: { evento: ComentarioEvento; teams: { name: string; color: string; photo_url: string | null }[] }) {
  const href = `/competitions/${encodeURIComponent(evento.competitionSlug)}/${encodeURIComponent(evento.temporada)}/${evento.partidoId}`;
  return (
    <Link href={href} className="block px-3.5 py-2.5 border-t border-line first:border-t-0 hover:bg-surface-2">
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
