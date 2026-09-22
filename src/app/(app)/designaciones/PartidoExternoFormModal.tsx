"use client";

import { useState, useTransition } from "react";
import { addPartidoExterno, updatePartidoExterno, type PartidoExternoInput } from "./actions";
import type { PartidoExterno } from "./queries";

export default function PartidoExternoFormModal({
  partido,
  onClose,
}: {
  partido?: PartidoExterno;
  onClose: () => void;
}) {
  const [fecha, setFecha] = useState(partido?.fecha ?? "");
  const [hora, setHora] = useState(partido?.hora?.slice(0, 5) ?? "");
  const [competencia, setCompetencia] = useState(partido?.competencia ?? "");
  const [categoria, setCategoria] = useState(partido?.categoria ?? "");
  const [descripcion, setDescripcion] = useState(partido?.descripcion ?? "");
  const [monto, setMonto] = useState(partido?.monto ? String(partido.monto) : "");
  const [notas, setNotas] = useState(partido?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: PartidoExternoInput = {
      fecha,
      hora: hora || null,
      competencia: competencia.trim() || null,
      categoria: categoria.trim() || null,
      descripcion,
      monto: Number(monto) || 0,
      notas: notas.trim() || null,
    };
    startTransition(async () => {
      const res = partido ? await updatePartidoExterno(partido.id, input) : await addPartidoExterno(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <form onSubmit={onSubmit} className="bg-surface border border-line rounded-2xl w-full max-w-[480px] p-6 max-h-[88vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-1">{partido ? "Editar partido externo" : "Agregar partido externo"}</h2>
        <p className="text-[12px] text-text-faint mb-4">
          Un partido que dirigiste por fuera de esta liga (otro torneo, otra asociación). Es solo para tu propio control —
          no lo ve el coordinador.
        </p>

        <div className="flex gap-2.5">
          <Field label="Día" className="flex-1">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" required />
          </Field>
          <Field label="Hora (opcional)" className="flex-1">
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full" />
          </Field>
        </div>

        <Field label="Partido / descripción">
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Instituto vs Estudiantes"
            className="w-full"
            required
          />
        </Field>

        <div className="flex gap-2.5">
          <Field label="Competencia (opcional)" className="flex-1">
            <input
              type="text"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              placeholder="Ej: Liga Federal"
              className="w-full"
            />
          </Field>
          <Field label="Categoría (opcional)" className="flex-1">
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full" />
          </Field>
        </div>

        <Field label="Monto cobrado (opcional)">
          <input type="number" min="0" step="1" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full" />
        </Field>

        <Field label="Notas (opcional)">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} style={{ height: 50 }} className="w-full" />
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
            {partido ? "Guardar cambios" : "Agregar"}
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
