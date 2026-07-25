"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPartido, updatePartido, createCategory, type PartidoInput } from "./actions";
import { createCompetition } from "@/app/(app)/competitions/actions";

interface DirectoryOption {
  id: string;
  name: string;
}

const NEW_VALUE = "__new__";

export default function PartidoFormModal({
  mode,
  partidoId,
  teams,
  referees,
  categories,
  competitions,
  defaultCompetitionId,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  partidoId?: string;
  teams: DirectoryOption[];
  referees: DirectoryOption[];
  categories: DirectoryOption[];
  competitions: DirectoryOption[];
  defaultCompetitionId?: string;
  initial?: {
    fecha: string;
    categoryId: string;
    competitionId: string;
    notes: string;
    teamLocalId: string;
    teamVisitId: string;
    refereeIds: string[];
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(initial?.fecha ?? "");
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [competitionOptions, setCompetitionOptions] = useState(competitions);
  const [competitionId, setCompetitionId] = useState(initial?.competitionId ?? defaultCompetitionId ?? "");
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
      categoryId: categoryId || null,
      competitionId: competitionId || null,
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

        <Field label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
        </Field>

        <DirectorySelect
          label="Categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
          onOptionCreated={(opt) => setCategoryOptions((opts) => [...opts, opt].sort((a, b) => a.name.localeCompare(b.name)))}
          createAction={async (name) => {
            const res = await createCategory(name);
            return res.ok ? { ok: true as const, item: res.category } : { ok: false as const, error: res.error };
          }}
          newPlaceholder="Ej: Superliga"
          newFieldLabel="Nombre de la categoría"
        />

        <DirectorySelect
          label="Competencia"
          value={competitionId}
          onChange={setCompetitionId}
          options={competitionOptions}
          onOptionCreated={(opt) =>
            setCompetitionOptions((opts) => [...opts, opt].sort((a, b) => a.name.localeCompare(b.name)))
          }
          createAction={async (name) => {
            const res = await createCompetition(name);
            return res.ok ? { ok: true as const, item: res.competition } : { ok: false as const, error: res.error };
          }}
          newPlaceholder="Ej: Asociación Rosarina de Básquet (AROB)"
          newFieldLabel="Nombre de la competencia"
        />

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

// Select de un directorio (categorías, competencias) con un "+ Nueva..." que
// permite crear una entrada al vuelo sin cerrar el modal de partido.
function DirectorySelect({
  label,
  value,
  onChange,
  options,
  onOptionCreated,
  createAction,
  newPlaceholder,
  newFieldLabel,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: DirectoryOption[];
  onOptionCreated: (opt: DirectoryOption) => void;
  createAction: (name: string) => Promise<{ ok: true; item: DirectoryOption } | { ok: false; error: string }>;
  newPlaceholder: string;
  newFieldLabel: string;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelectChange(v: string) {
    if (v === NEW_VALUE) {
      setCreating(true);
      return;
    }
    onChange(v);
  }

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await createAction(trimmed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOptionCreated(res.item);
      onChange(res.item.id);
      setNewName("");
      setCreating(false);
    });
  }

  return (
    <>
      <Field label={label}>
        <select value={value} onChange={(e) => handleSelectChange(e.target.value)} className="w-full">
          <option value="">Sin especificar</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
          <option value={NEW_VALUE}>+ Nueva {label.toLowerCase()}...</option>
        </select>
      </Field>

      {creating && (
        <div className="flex gap-2 items-end mb-3.5 -mt-1.5">
          <Field label={newFieldLabel} className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={newPlaceholder}
              className="w-full"
              autoFocus
            />
          </Field>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13px] px-3 py-2"
          >
            Crear
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="text-bad-text text-[12.5px] -mt-2 mb-3">{error}</p>}
    </>
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
