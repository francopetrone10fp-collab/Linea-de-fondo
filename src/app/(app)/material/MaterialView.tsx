"use client";

import { useMemo, useState, useTransition } from "react";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { MATERIAL_TYPES, materialTypeInfo, truncateText } from "@/lib/constants";
import { createMaterial, deleteMaterial } from "./actions";
import type { MaterialType } from "@/lib/database.types";

interface Material {
  id: string;
  title: string;
  type: MaterialType;
  url: string;
  description: string | null;
  created_at: string;
  createdByName: string;
}

export default function MaterialView({ materials, canManage }: { materials: Material[]; canManage: boolean }) {
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", type: "pdf" as MaterialType, url: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (typeFilter ? materials.filter((m) => m.type === typeFilter) : materials),
    [materials, typeFilter]
  );

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createMaterial(form);
      if (!res.ok) setError(res.error);
      else {
        setShowModal(false);
        setForm({ title: "", type: "pdf", url: "", description: "" });
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este material? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await deleteMaterial(id);
    });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // sin permisos de portapapeles, no bloqueamos la UI por esto
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Material didáctico</h1>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent hover:bg-accent-dim text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar material
          </button>
        )}
      </div>

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Acá se guardan links a material de estudio (PDF, Word, videos, presentaciones, páginas). No
        se suben archivos directo — pegá un link de Drive, YouTube, etc.
      </div>

      <div className="mb-5">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {MATERIAL_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Empty
          title={materials.length === 0 ? "Todavía no hay material cargado" : "Sin resultados"}
          desc={
            materials.length === 0
              ? "Sumá el primer PDF, video o link de estudio para el equipo."
              : "No hay material de ese tipo todavía."
          }
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {filtered.map((m) => {
            const t = materialTypeInfo(m.type);
            return (
              <div key={m.id} className="bg-surface border border-line rounded-xl p-4">
                <span
                  className="text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full inline-block mb-2"
                  style={{ background: t.bg, color: t.color }}
                >
                  {t.label}
                </span>
                <p className="text-[14.5px] font-semibold mt-0 mb-1.5">{m.title}</p>
                {m.description && (
                  <p className="text-[12.5px] text-text-dim mb-2.5 leading-snug">
                    {truncateText(m.description, 110)}
                  </p>
                )}
                <p className="text-[11px] text-text-faint mb-2.5">
                  Subido por {m.createdByName} · {new Date(m.created_at).toLocaleDateString("es-AR")}
                </p>
                <div className="flex justify-between items-center">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => copyLink(m.url)}
                    className="text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-1.5"
                  >
                    Abrir material
                  </a>
                  {canManage && (
                    <button
                      onClick={() => onDelete(m.id)}
                      title="Eliminar material"
                      className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
          <form
            onSubmit={onSave}
            className="bg-surface border border-line rounded-2xl w-full max-w-[520px] p-6 max-h-[88vh] overflow-y-auto"
          >
            <h2 className="font-display text-[19px] mb-4">Nuevo material</h2>
            <FieldLabel label="Título">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Manual de mecánica de 3 árbitros"
                className="w-full"
              />
            </FieldLabel>
            <div className="flex gap-2.5">
              <FieldLabel label="Tipo" className="flex-1">
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MaterialType }))}
                  className="w-full"
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Link" className="flex-1">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full"
                />
              </FieldLabel>
            </div>
            <FieldLabel label="Descripción (opcional)">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ height: 60 }}
                placeholder="De qué trata este material..."
                className="w-full"
              />
            </FieldLabel>
            {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={isPending}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Guardar material
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FieldLabel({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 mb-3.5 ${className ?? ""}`}>
      <label className="text-[12.5px] text-text-dim font-medium">{label}</label>
      {children}
    </div>
  );
}
