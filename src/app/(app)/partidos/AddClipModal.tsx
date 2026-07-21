"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClip } from "./actions";
import { SITUATIONS } from "@/lib/constants";
import type { Situation } from "@/lib/database.types";

export default function AddClipModal({
  partidoId,
  contextLabel,
  crew,
  defaultRefereeId,
  onClose,
}: {
  partidoId: string;
  contextLabel: string;
  crew: { id: string; name: string }[];
  defaultRefereeId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [situation, setSituation] = useState<Situation>(SITUATIONS[0]);
  const [quarter, setQuarter] = useState("Q1");
  const [clock, setClock] = useState("");
  const [refereeId, setRefereeId] = useState(defaultRefereeId ?? crew[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createClip({
        partidoId,
        title,
        videoUrl,
        situation,
        quarter,
        clock,
        refereeId: refereeId || null,
        notes,
      });
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
        <h2 className="font-display text-[19px] mb-4">Nuevo clip</h2>
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
        <Field label="Notas iniciales (opcional)">
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
            Guardar clip
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
