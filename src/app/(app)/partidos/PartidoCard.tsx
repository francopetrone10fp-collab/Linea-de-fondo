"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ColorBadge } from "@/components/Badge";
import { EVAL_LEVELS, truncateText } from "@/lib/constants";
import { deletePartido } from "./actions";
import PartidoFormModal from "./PartidoFormModal";
import type { PartidoFull } from "./queries";
import type { Evaluation } from "@/lib/database.types";

interface DirectoryOption {
  id: string;
  name: string;
}

export function refereesText(p: PartidoFull) {
  return p.referees.length ? p.referees.map((r) => r.name).join(" · ") : "Sin árbitros asignados";
}

// Segmento de URL para la carpeta de categoría de un partido (id real, o el
// bucket fijo para los que todavía no tienen una categoría asignada).
export function categorySlugFor(p: PartidoFull) {
  return p.category?.id ?? "sin-categoria";
}

export function Matchup({ p, size = 24, bold = true }: { p: PartidoFull; size?: number; bold?: boolean }) {
  if (!p.teamLocal && !p.teamVisit) return null;
  const nameCls = bold ? "font-semibold text-[13.5px]" : "text-[12.5px] text-text-dim";
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${bold ? "mb-2.5" : "mb-1.5"}`}>
      {p.teamLocal && (
        <>
          <ColorBadge name={p.teamLocal.name} color={p.teamLocal.color} size={size} />
          <span className={nameCls}>{p.teamLocal.name}</span>
        </>
      )}
      <span className="text-text-faint text-[11px]">vs</span>
      {p.teamVisit && (
        <>
          <ColorBadge name={p.teamVisit.name} color={p.teamVisit.color} size={size} />
          <span className={nameCls}>{p.teamVisit.name}</span>
        </>
      )}
    </div>
  );
}

export function EvalSummary({ counts, pendingCount }: { counts: Record<Evaluation, number>; pendingCount: number }) {
  const chips = EVAL_LEVELS.filter((l) => counts[l.key] > 0);
  if (chips.length === 0 && pendingCount === 0) {
    return <CallTab evaluation={null} label="Sin jugadas cargadas" />;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((l) => (
        <CallTab key={l.key} evaluation={l.key} label={`${counts[l.key]} ${l.label.toLowerCase()}`} />
      ))}
      {pendingCount > 0 && <CallTab evaluation={null} label={`${pendingCount} sin evaluar`} />}
    </div>
  );
}

const EVAL_TAB_CLASSES: Record<string, string> = {
  mala: "text-bad-text bg-bad-bg",
  estandar: "text-amber-text bg-amber-bg",
  buena: "text-good-text bg-good-bg",
  relevante: "text-relevant-text bg-relevant-bg",
};

export function CallTab({ evaluation, label }: { evaluation: Evaluation | null; label: string }) {
  const cls = evaluation ? EVAL_TAB_CLASSES[evaluation] : "text-text-faint bg-surface-3";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-0.5 rounded-full w-fit ${cls}`}>
      {label}
    </span>
  );
}

export function FinalizedBadge({ name, at }: { name: string; at: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-relevant-text bg-relevant-bg px-2.5 py-0.5 rounded-full">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Finalizada por {name} · {new Date(at).toLocaleDateString("es-AR")}
    </span>
  );
}

export function PartidoCard({
  p,
  temporada,
  evalCounts,
  pendingCount,
  readStatus,
  canManage = false,
  teams = [],
  referees = [],
  categories = [],
  competitions = [],
}: {
  p: PartidoFull;
  temporada: string;
  evalCounts: Record<Evaluation, number>;
  pendingCount: number;
  readStatus?: { confirmed: number; total: number };
  canManage?: boolean;
  teams?: DirectoryOption[];
  referees?: DirectoryOption[];
  categories?: DirectoryOption[];
  competitions?: DirectoryOption[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [isPending, startTransition] = useTransition();
  const categorySlug = categorySlugFor(p);

  const fechaFmt = p.fecha
    ? new Date(p.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Sin fecha";

  function onDelete() {
    const totalClips = pendingCount + Object.values(evalCounts).reduce((a, b) => a + b, 0);
    const msg =
      totalClips > 0
        ? `¿Eliminar este partido? También se van a eliminar sus ${totalClips} clip${totalClips === 1 ? "" : "s"} cargado${totalClips === 1 ? "" : "s"}. Esta acción no se puede deshacer.`
        : "¿Eliminar este partido? Esta acción no se puede deshacer.";
    if (!confirm(msg)) return;
    startTransition(async () => {
      await deletePartido(p.id, temporada, categorySlug);
    });
  }

  return (
    <div className="relative bg-surface border border-line rounded-xl overflow-hidden hover:border-text-faint">
      <Link
        href={`/partidos/${encodeURIComponent(temporada)}/${encodeURIComponent(categorySlug)}/${p.id}`}
        aria-label="Ver detalle del partido"
        className="absolute inset-0"
      />
      <div className="p-4 pt-4">
        <div className="flex justify-between items-center mb-2 gap-2">
          <span className="font-mono text-[12px] text-text-dim">{fechaFmt}</span>
          {p.finalizedAt && p.finalizedByName && <FinalizedBadge name={p.finalizedByName} at={p.finalizedAt} />}
        </div>
        <Matchup p={p} />
        <div className="flex flex-wrap gap-1.5">
          {p.category && (
            <span className="text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-3 text-text-dim">
              {p.category.name}
            </span>
          )}
          {p.competition && (
            <span className="text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-3 text-text-dim">
              {p.competition.name}
            </span>
          )}
        </div>
        <p className="text-[12.5px] text-text-dim mt-2">{refereesText(p)}</p>
        {p.notes && <p className="text-[12.5px] text-text-faint mt-1">{truncateText(p.notes, 90)}</p>}
        <div className="mt-2">
          <EvalSummary counts={evalCounts} pendingCount={pendingCount} />
        </div>
        {p.finalizedAt && readStatus && readStatus.total > 0 && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-text-dim bg-surface-2 px-2.5 py-0.5 rounded-full">
              {readStatus.confirmed}/{readStatus.total} lo vieron
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mt-3">
          <span className="text-accent text-[12.5px] font-semibold flex items-center gap-1">
            Ver detalle
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
          {canManage && (
            <div className="relative z-10 flex gap-1">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                title="Editar partido"
                className="text-text-faint hover:text-text hover:bg-surface-2 p-1 rounded-md"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                title="Eliminar partido"
                className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md disabled:opacity-50"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <PartidoFormModal
          mode="edit"
          partidoId={p.id}
          teams={teams}
          referees={referees}
          categories={categories}
          competitions={competitions}
          initial={{
            fecha: p.fecha ?? "",
            categoryId: p.category?.id ?? "",
            competitionId: p.competition?.id ?? "",
            notes: p.notes ?? "",
            teamLocalId: p.teamLocal?.id ?? "",
            teamVisitId: p.teamVisit?.id ?? "",
            refereeIds: p.referees.map((r) => r.id),
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
