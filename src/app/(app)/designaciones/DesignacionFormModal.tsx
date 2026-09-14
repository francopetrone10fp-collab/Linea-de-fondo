"use client";

import { useState, useTransition } from "react";
import { createDesignacion, updateDesignacion, type DesignacionInput } from "./actions";
import type { DesignacionEstado, Rama } from "@/lib/database.types";
import type { DesignacionFull, TarifaCategoria } from "./queries";

const ESTADOS: { key: DesignacionEstado; label: string }[] = [
  { key: "programado", label: "Programado" },
  { key: "confirmar", label: "A confirmar" },
  { key: "suspendido", label: "Suspendido" },
  { key: "jugado", label: "Jugado" },
];

export default function DesignacionFormModal({
  mode,
  designacion,
  tarifas,
  competencias,
  localidades,
  onClose,
}: {
  mode: "create" | "edit";
  designacion?: DesignacionFull;
  tarifas: TarifaCategoria[];
  competencias: string[];
  localidades: string[];
  onClose: () => void;
}) {
  const [jornada, setJornada] = useState(designacion?.jornada ?? "");
  const [fecha, setFecha] = useState(designacion?.fecha ?? "");
  const [hora, setHora] = useState(designacion?.hora?.slice(0, 5) ?? "");
  const [categoria, setCategoria] = useState(designacion?.categoria ?? "");
  const [competencia, setCompetencia] = useState(designacion?.competencia ?? "");
  const [rama, setRama] = useState<Rama | "">(designacion?.rama ?? "");
  const [equipoLocal, setEquipoLocal] = useState(designacion?.equipoLocal ?? "");
  const [equipoVisitante, setEquipoVisitante] = useState(designacion?.equipoVisitante ?? "");
  const [sede, setSede] = useState(designacion?.sede ?? "");
  const [localidad, setLocalidad] = useState(designacion?.localidad ?? "");
  const [estado, setEstado] = useState<DesignacionEstado>(designacion?.estado ?? "programado");
  const [notas, setNotas] = useState(designacion?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: DesignacionInput = {
      jornada,
      fecha,
      hora,
      categoria,
      competencia,
      rama,
      equipoLocal,
      equipoVisitante,
      sede,
      localidad,
      estado,
      notas,
    };
    startTransition(async () => {
      const res = mode === "create" ? await createDesignacion(input) : await updateDesignacion(designacion!.id, input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <form onSubmit={onSubmit} className="bg-surface border border-line rounded-2xl w-full max-w-[560px] p-6 max-h-[88vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-4">{mode === "create" ? "Nueva designación" : "Editar designación"}</h2>

        <div className="flex gap-2.5">
          <Field label="Jornada / Fecha de torneo" className="flex-1">
            <input type="text" value={jornada} onChange={(e) => setJornada(e.target.value)} placeholder="FECHA 5" className="w-full" />
          </Field>
          <Field label="Estado" className="flex-1">
            <select value={estado} onChange={(e) => setEstado(e.target.value as DesignacionEstado)} className="w-full">
              {ESTADOS.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-2.5">
          <Field label="Día" className="flex-1">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
          </Field>
          <Field label="Hora" className="flex-1">
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full" />
          </Field>
        </div>

        <Field label="Categoría">
          <input
            type="text"
            list="designacion-categorias"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ej: PRIMERA FEM A, SUB 9 - Pre Mini A"
            className="w-full"
          />
          <datalist id="designacion-categorias">
            {tarifas.map((t) => (
              <option key={t.categoria} value={t.categoria} />
            ))}
          </datalist>
        </Field>

        <div className="flex gap-2.5">
          <Field label="Competencia" className="flex-1">
            <input
              type="text"
              list="designacion-competencias"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              placeholder="LFF, Federativos..."
              className="w-full"
            />
            <datalist id="designacion-competencias">
              {competencias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Rama" className="flex-1">
            <select value={rama} onChange={(e) => setRama(e.target.value as Rama | "")} className="w-full">
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </Field>
        </div>

        <div className="flex gap-2.5">
          <Field label="Local" className="flex-1">
            <input type="text" value={equipoLocal} onChange={(e) => setEquipoLocal(e.target.value)} className="w-full" />
          </Field>
          <Field label="Visitante" className="flex-1">
            <input type="text" value={equipoVisitante} onChange={(e) => setEquipoVisitante(e.target.value)} className="w-full" />
          </Field>
        </div>

        <div className="flex gap-2.5">
          <Field label="Sede / cancha (opcional)" className="flex-1">
            <input type="text" value={sede} onChange={(e) => setSede(e.target.value)} className="w-full" />
          </Field>
          <Field label="Localidad (para el viático, opcional)" className="flex-1">
            <input
              type="text"
              list="designacion-localidades"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ej: Funes"
              className="w-full"
            />
            <datalist id="designacion-localidades">
              {localidades.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Observaciones (opcional, las ven los árbitros designados)">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ height: 50 }}
            placeholder="Ej: Copa Centenario, con Desideri..."
            className="w-full"
          />
        </Field>

        <p className="text-[11.5px] text-text-faint mb-1">
          Los árbitros y el comisionado técnico se asignan después, directamente desde la grilla.
        </p>

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
            {mode === "create" ? "Guardar designación" : "Guardar cambios"}
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
