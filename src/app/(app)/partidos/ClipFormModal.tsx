"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClip, updateClip } from "./actions";
import { SITUATIONS, WHISTLE_TYPES } from "@/lib/constants";
import type { Situation, WhistleType } from "@/lib/database.types";

export default function ClipFormModal({
  mode,
  clipId,
  partidoId,
  contextLabel,
  crew,
  defaultRefereeId,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  clipId?: string;
  partidoId: string;
  contextLabel: string;
  crew: { id: string; name: string }[];
  defaultRefereeId?: string | null;
  initial?: {
    title: string;
    videoUrl: string;
    situation: Situation;
    quarter: string;
    clock: string;
    refereeId: string;
    notes: string;
    whistleType: WhistleType | null;
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [situation, setSituation] = useState<Situation>(initial?.situation ?? SITUATIONS[0]);
  const [quarter, setQuarter] = useState(initial?.quarter ?? "Q1");
  const [clock, setClock] = useState(initial?.clock ?? "");
  const [refereeId, setRefereeId] = useState(initial?.refereeId ?? defaultRefereeId ?? crew[0]?.id ?? "");
  const [whistleType, setWhistleType] = useState<WhistleType | "">(initial?.whistleType ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      partidoId,
      title,
      videoUrl,
      situation,
      quarter,
      clock,
      refereeId: refereeId || null,
      notes,
      whistleType: whistleType || null,
    };
    startTransition(async () => {
      const res = mode === "create" ? await createClip(input) : await updateClip(clipId!, input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <form onSubmit={onSubmit} className="bg-surface border border-line rounded-2xl w-full max-w-[520px] p-6 max-h-[88vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-4">{mode === "create" ? "Nuevo clip" : "Editar clip"}</h2>
        <div className="bg-surface-2 border border-line rounded-lg px-2.5 py-2 text-[12.5px] text-text-dim mb-3.5">
          {contextLabel}
        </div>

        <Field label="Título de la jugada">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Bloqueo/carga bajo el aro"
            className="w-full"
          />
        </Field>
        <Field label="Link del video (YouTube, Vimeo, Google Drive o archivo directo)">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full"
          />
        </Field>
        <div className="flex gap-2.5">
          <Field label="Tipo de jugada" className="flex-1">
            <select value={situation} onChange={(e) => setSituation(e.target.value as Situation)} className="w-full">
              {SITUATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cuarto" className="flex-1">
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="w-full">
              {["Q1", "Q2", "Q3", "Q4", "Prórroga"].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Reloj de juego (mm:ss)">
          <input type="text" value={clock} onChange={(e) => setClock(e.target.value)} placeholder="04:12" className="w-full" />
        </Field>
        <Field label="¿A qué árbitro corresponde esta jugada?">
          <select value={refereeId} onChange={(e) => setRefereeId(e.target.value)} className="w-full">
            {crew.length === 0 ? (
              <option value="">Sin árbitros asignados a este partido</option>
            ) : (
              crew.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))
            )}
          </select>
        </Field>
        <Field label="Tipo de silbato (opcional)">
          <select value={whistleType} onChange={(e) => setWhistleType(e.target.value as WhistleType | "")} className="w-full">
            <option value="">Sin especificar</option>
            {WHISTLE_TYPES.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label} — {w.fullName}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-text-faint">
            Ayuda a dar seguimiento a la impulsividad/velocidad de procesamiento en la decisión.
          </span>
        </Field>
        <Field label="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ height: 60 }}
            placeholder="Contexto de la jugada..."
            className="w-full"
          />
        </Field>

        {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}

        <div className="flex justify-end gap-2.5 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
          >
            Cancelar
          </button>
          <button
            disabled={isPending}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            {mode === "create" ? "Guardar clip" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 mb-3.5 ${className ?? ""}`}>
      <label className="text-[12.5px] text-text-dim font-medium">{label}</label>
      {children}
    </div>
  );
}
