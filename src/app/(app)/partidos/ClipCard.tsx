"use client";

import { useState, useTransition } from "react";
import { CallTab } from "./PartidoCard";
import { deleteClip, setClipEvaluation } from "./actions";
import { EVAL_LEVELS } from "@/lib/constants";
import type { ClipFull } from "./queries";
import type { Evaluation } from "@/lib/database.types";

const CARD_BORDER: Record<string, string> = {
  mala: "border-l-bad",
  estandar: "border-l-amber",
  buena: "border-l-good",
  relevante: "border-l-relevant",
};

const EVAL_BTN_ACTIVE: Record<Evaluation, string> = {
  mala: "bg-bad-bg border-bad text-bad-text",
  estandar: "bg-amber-bg border-amber text-amber-text",
  buena: "bg-good-bg border-good text-good-text",
  relevante: "bg-relevant-bg border-relevant text-relevant-text",
};

export default function ClipCard({
  clip,
  canEvaluate,
  canDelete,
  locked,
}: {
  clip: ClipFull;
  canEvaluate: boolean;
  canDelete: boolean;
  locked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onEval(value: Evaluation) {
    const next = clip.evaluation === value ? null : value;
    startTransition(async () => {
      await setClipEvaluation(clip.id, next);
    });
  }

  function onDelete() {
    if (!confirm("¿Eliminar este clip? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await deleteClip(clip.id);
    });
  }

  async function copyLink() {
    if (!clip.videoUrl) return;
    try {
      await navigator.clipboard.writeText(clip.videoUrl);
    } catch {
      // sin permisos de portapapeles, no bloqueamos la UI
    }
  }

  const borderCls = clip.evaluation ? CARD_BORDER[clip.evaluation] : "border-l-text-faint";

  return (
    <div className={`bg-surface border border-line rounded-xl overflow-hidden border-l-4 ${borderCls}`}>
      <div className="p-3.5 pt-3.5">
        <div className="flex justify-between items-center mb-2 gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-3 text-text-dim whitespace-nowrap">
            {clip.situation}
          </span>
          <span className="font-mono text-[12px] text-text-dim whitespace-nowrap">
            {clip.quarter} · {clip.clock || "--:--"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-semibold m-0">{clip.title}</p>
          {clip.videoUrl && (
            <a
              href={clip.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={copyLink}
              title="Abrir video"
              className="flex-none w-[26px] h-[26px] rounded-full bg-[#E8342A] hover:bg-[#C92920] text-white flex items-center justify-center"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </a>
          )}
        </div>
        <p className="text-[12.5px] text-text-dim my-2.5">
          {clip.referee?.name ?? "Árbitro sin especificar"}
        </p>
        <CallTab evaluation={clip.evaluation} label={clip.evaluation ? EVAL_LEVELS.find((l) => l.key === clip.evaluation)!.label : "Sin evaluar"} />

        {canEvaluate && !locked && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {EVAL_LEVELS.map((l) => (
              <button
                key={l.key}
                disabled={isPending}
                onClick={() => onEval(l.key)}
                className={`flex-1 min-w-[90px] border rounded-md py-2 px-1.5 text-[12px] font-semibold text-center ${
                  clip.evaluation === l.key ? EVAL_BTN_ACTIVE[l.key] : "border-line bg-surface-2 text-text-dim"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-1.5">
          {clip.notes ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-accent text-[12.5px] font-semibold flex items-center gap-1"
            >
              {expanded ? "Ocultar notas" : "Ver notas"}
            </button>
          ) : (
            <span />
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              title="Eliminar clip"
              className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          )}
        </div>

        {expanded && (
          <div className="border-t border-dashed border-line mt-3 pt-3">
            <p className="text-[12.5px] text-text-dim m-0">
              <b className="text-text-faint">Notas:</b> {clip.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
