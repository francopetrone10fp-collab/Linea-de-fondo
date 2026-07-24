"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPartido, updatePartido, type PartidoInput } from "./actions";

interface DirectoryOption {
  id: string;
  name: string;
}

export default function PartidoFormModal({
  mode,
  partidoId,
  teams,
  referees,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  partidoId?: string;
  teams: DirectoryOption[];
  referees: DirectoryOption[];
  initial?: {
    fecha: string;
    competition: string;
    notes: string;
    teamLocalId: string;
    teamVisitId: string;
    refereeIds: string[];
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(initial?.fecha ?? "");
  const [competition, setCompetition] = useState(initial?.competition ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [teamLocalId, setTeamLocalId] = useState(initial?.teamLocalId ?? "");
  const [teamVisitId, setTeamVisitId] = useState(initial?.teamVisitId ?? "");
  const [ref1, setRef1] = useState(initial?.refereeIds[0] ?? "");
  const [ref2, setRef2] = useState(initial?.refereeIds[1] ?? "");
  const [ref3, setRef3] = useState(initial?.refereeIds[2] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: PartidoInput = {
      fecha,
      competition,
      notes,
      teamLocalId: teamLocalId || null,
      teamVisitId: teamVisitId || null,
      refereeIds: [ref1 || null, ref2 || null, ref3 || null],
    };
    startTransition(async () => {
      const res = mode === "create" ? await createPartido(input) : await updatePartido(partidoId!, input);
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
      <form onSubmit={onSubmit} className="bg-surface border border-line rounded-2xl w-full max-w-[560px] p-6 max-h-[88vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-4">{mode === "create" ? "Nuevo partido" : "Editar partido"}</h2>

        <div className="flex gap-2.5">
          <Field label="Fecha" className="flex-1">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
          </Field>
          <Field label="Competencia" className="flex-1">
            <input
              type="text"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              placeholder="Ej: Liga U19 — Fecha 8"
              className="w-full"
            />
          </Field>
        </div>

        <Field label="Árbitro 1">
          <select value={ref1} onChange={(e) => setRef1(e.target.value)} className="w-full">
            <option value="">Sin especificar</option>
            {referees.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2.5">
          <Field label="Árbitro 2 (opcional)" className="flex-1">
            <select value={ref2} onChange={(e) => setRef2(e.target.value)} className="w-full">
              <option value="">Sin especificar</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Árbitro 3 (opcional)" className="flex-1">
            <select value={ref3} onChange={(e) => setRef3(e.target.value)} className="w-full">
              <option value="">Sin especificar</option>
              {referees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-2.5">
          <Field label="Equipo local" className="flex-1">
            <select value={teamLocalId} onChange={(e) => setTeamLocalId(e.target.value)} className="w-full">
              <option value="">Sin especificar</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipo visitante" className="flex-1">
            <select value={teamVisitId} onChange={(e) => setTeamVisitId(e.target.value)} className="w-full">
              <option value="">Sin especificar</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ height: 60 }}
            placeholder="Contexto general del partido..."
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
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            {mode === "create" ? "Guardar partido" : "Guardar cambios"}
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
