"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refereesText, FinalizedBadge, EvalSummary } from "../../PartidoCard";
import ClipCard from "../../ClipCard";
import ClipFormModal from "../../ClipFormModal";
import PartidoFormModal from "../../PartidoFormModal";
import ReportModal from "../../ReportModal";
import CommentsThread from "@/components/CommentsThread";
import ReadStatusSection from "../../ReadStatusSection";
import { deletePartido, finalizePartido, reopenPartido } from "../../actions";
import type { PartidoFull, ClipFull, CommentFull, ReadConfirmation } from "../../queries";
import type { Evaluation } from "@/lib/database.types";

export default function PartidoDetailView({
  partido,
  clips,
  comments,
  reads,
  teams,
  referees,
  temporada,
  canEvaluate,
  canDelete,
  isArbitro,
  myRefereeId,
  initialViewedClipIds,
}: {
  partido: PartidoFull;
  clips: ClipFull[];
  comments: CommentFull[];
  reads: ReadConfirmation[];
  teams: { id: string; name: string }[];
  referees: { id: string; name: string }[];
  temporada: string;
  canEvaluate: boolean;
  canDelete: boolean;
  isArbitro: boolean;
  myRefereeId: string | null;
  initialViewedClipIds: string[];
}) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showAddClip, setShowAddClip] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [viewedClipIds, setViewedClipIds] = useState<Set<string>>(() => new Set(initialViewedClipIds));

  const hasConfirmedBefore = reads.some((r) => r.refereeId === myRefereeId);
  const shouldTrackViews =
    isArbitro && !!myRefereeId && !!partido.finalizedAt && partido.referees.some((r) => r.id === myRefereeId) && !hasConfirmedBefore;

  const counts: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };
  let pendingCount = 0;
  clips.forEach((c) => {
    if (c.evaluation) counts[c.evaluation]++;
    else pendingCount++;
  });

  const fechaFmt = partido.fecha
    ? new Date(partido.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Sin fecha";
  const matchup = [partido.teamLocal?.name, partido.teamVisit?.name].filter(Boolean).join(" vs ") || "Partido sin equipos cargados";

  function onFinalize() {
    const msg =
      pendingCount > 0
        ? `Todavía hay ${pendingCount} jugada${pendingCount === 1 ? "" : "s"} sin evaluar. ¿Finalizar igual?`
        : "¿Finalizar la evaluación de este partido? Vas a poder reabrirla después si hace falta.";
    if (!confirm(msg)) return;
    startTransition(async () => {
      await finalizePartido(partido.id);
      router.refresh();
      setShowReport(true);
    });
  }

  function onReopen() {
    if (!confirm("¿Reabrir la evaluación de este partido?")) return;
    startTransition(async () => {
      await reopenPartido(partido.id);
      router.refresh();
    });
  }

  function onDelete() {
    const msg =
      clips.length > 0
        ? `¿Eliminar este partido? También se van a eliminar sus ${clips.length} clip${clips.length === 1 ? "" : "s"} cargado${clips.length === 1 ? "" : "s"}. Esta acción no se puede deshacer.`
        : "¿Eliminar este partido? Esta acción no se puede deshacer.";
    if (!confirm(msg)) return;
    startTransition(async () => {
      await deletePartido(partido.id, temporada);
    });
  }

  const crew = partido.referees.map((r) => ({ id: r.id, name: r.name }));
  const defaultRefereeId = crew.find((r) => r.id === myRefereeId)?.id ?? crew[0]?.id;

  return (
    <div>
      <Link
        href={`/partidos/${encodeURIComponent(temporada)}`}
        className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a partidos
      </Link>

      <div className="flex justify-between items-start gap-4 flex-wrap mb-1.5">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1.5">{matchup}</h1>
          <p className="text-text-dim text-[13px] m-0 mb-0.5">
            {fechaFmt}
            {partido.competition ? ` · ${partido.competition}` : ""}
          </p>
          <p className="text-text-dim text-[13px] m-0">Árbitros: {refereesText(partido)}</p>
        </div>
        {canEvaluate && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdit(true)}
              title="Editar partido"
              className="text-text-faint hover:text-text hover:bg-surface-2 p-1.5 rounded-md"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              title="Eliminar partido"
              className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1.5 rounded-md"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <EvalSummary counts={counts} pendingCount={pendingCount} />
      </div>

      <div className="flex items-center gap-2.5 flex-wrap my-4">
        {partido.finalizedAt && partido.finalizedByName ? (
          <>
            <FinalizedBadge name={partido.finalizedByName} at={partido.finalizedAt} />
            <button
              onClick={() => setShowReport(true)}
              className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-1.5"
            >
              Ver informe
            </button>
            {canEvaluate && (
              <button
                onClick={onReopen}
                disabled={isPending}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-1.5"
              >
                Reabrir
              </button>
            )}
          </>
        ) : (
          canEvaluate && (
            <button
              onClick={onFinalize}
              disabled={isPending}
              className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
            >
              Finalizar evaluación
            </button>
          )
        )}
      </div>

      {partido.notes && (
        <p className="text-[13px] text-text-dim my-4">
          <b className="text-text-faint">Notas:</b> {partido.notes}
        </p>
      )}

      <div className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim mt-6 mb-3.5">
        Comentarios generales
      </div>
      <CommentsThread entityType="partido" entityId={partido.id} comments={comments} canManage={canEvaluate} />

      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim">
            Clips de este partido ({clips.length})
          </span>
          {canEvaluate && !partido.finalizedAt && (
            <button
              onClick={() => setShowAddClip(true)}
              className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-1.5"
            >
              + Agregar clip
            </button>
          )}
        </div>
        {clips.length === 0 ? (
          <p className="text-[12.5px] text-text-faint m-0">
            Todavía no hay clips cargados para este partido. La evaluación se hace jugada por jugada, acá adentro.
          </p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {clips.map((c) => (
              <ClipCard
                key={c.id}
                clip={c}
                canEvaluate={canEvaluate}
                canDelete={canDelete}
                locked={!!partido.finalizedAt}
                crew={crew}
                contextLabel={`${matchup} · ${fechaFmt}`}
                trackView={shouldTrackViews}
                alreadyViewed={viewedClipIds.has(c.id)}
                onViewed={(clipId) => setViewedClipIds((prev) => new Set(prev).add(clipId))}
              />
            ))}
          </div>
        )}
      </div>

      <ReadStatusSection
        partido={partido}
        reads={reads}
        isArbitro={isArbitro}
        myRefereeId={myRefereeId}
        totalClips={clips.length}
        viewedCount={viewedClipIds.size}
      />

      {showEdit && (
        <PartidoFormModal
          mode="edit"
          partidoId={partido.id}
          teams={teams}
          referees={referees}
          initial={{
            fecha: partido.fecha ?? "",
            competition: partido.competition ?? "",
            notes: partido.notes ?? "",
            teamLocalId: partido.teamLocal?.id ?? "",
            teamVisitId: partido.teamVisit?.id ?? "",
            refereeIds: partido.referees.map((r) => r.id),
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showAddClip && (
        <ClipFormModal
          mode="create"
          partidoId={partido.id}
          contextLabel={`Se va a agregar a: ${matchup} · ${fechaFmt}`}
          crew={crew}
          defaultRefereeId={defaultRefereeId}
          onClose={() => setShowAddClip(false)}
        />
      )}

      {showReport && (
        <ReportModal p={partido} clips={clips} comments={comments} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
