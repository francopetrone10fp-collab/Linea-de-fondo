"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { CLASS_LEVELS, truncateText } from "@/lib/constants";
import { createClass, deleteClass, updateClass } from "../actions";
import type { ClassLevel } from "@/lib/database.types";

interface Clase {
  id: string;
  title: string;
  video_url: string | null;
  notes: string | null;
  levels: ClassLevel[];
  created_at: string;
  clipCount: number;
  materialCount: number;
}

export default function ClassesListView({
  yearId,
  yearName,
  classes,
  canManage,
}: {
  yearId: string;
  yearName: string;
  classes: Clase[];
  canManage: boolean;
}) {
  const [levelFilter, setLevelFilter] = useState<ClassLevel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; videoUrl: string; notes: string; levels: ClassLevel[] }>({
    title: "",
    videoUrl: "",
    notes: "",
    levels: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (levelFilter.length === 0) return classes;
    return classes.filter((c) => c.levels.some((l) => levelFilter.includes(l)));
  }, [classes, levelFilter]);

  function toggleLevelFilter(level: ClassLevel) {
    setLevelFilter((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }

  function toggleFormLevel(level: ClassLevel) {
    setForm((f) => ({
      ...f,
      levels: f.levels.includes(level) ? f.levels.filter((l) => l !== level) : [...f.levels, level],
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({ title: "", videoUrl: "", notes: "", levels: [] });
    setError(null);
    setShowModal(true);
  }

  function openEdit(c: Clase) {
    setEditingId(c.id);
    setForm({ title: c.title, videoUrl: c.video_url ?? "", notes: c.notes ?? "", levels: c.levels });
    setError(null);
    setShowModal(true);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = editingId ? await updateClass(editingId, form) : await createClass(yearId, form);
      if (!res.ok) setError(res.error);
      else {
        setShowModal(false);
        setEditingId(null);
        setForm({ title: "", videoUrl: "", notes: "", levels: [] });
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta clase? También se eliminan sus clips y vínculos con material. Esta acción no se puede deshacer."))
      return;
    startTransition(async () => {
      await deleteClass(id, yearId);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <h1 className="font-display text-2xl font-semibold">Clases — {yearName}</h1>
        {canManage && (
          <button
            onClick={openCreate}
            className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar clase
          </button>
        )}
      </div>

      {classes.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          {CLASS_LEVELS.map((l) => {
            const active = levelFilter.includes(l.key);
            return (
              <button
                key={l.key}
                onClick={() => toggleLevelFilter(l.key)}
                className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border"
                style={
                  active
                    ? { background: l.bg, color: l.color, borderColor: l.color }
                    : { background: "transparent", color: "var(--text-faint)", borderColor: "var(--line)" }
                }
              >
                {l.label}
              </button>
            );
          })}
        </div>
      )}

      {classes.length === 0 ? (
        <Empty
          title="Todavía no hay clases en este año"
          desc={canManage ? "Agregá la primera clase." : ""}
        />
      ) : filtered.length === 0 ? (
        <Empty title="Sin resultados" desc="Ninguna clase coincide con ese filtro de nivel." />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {filtered.map((c) => (
            <div key={c.id} className="relative bg-surface border border-line rounded-xl p-4 hover:border-text-faint">
              <Link href={`/clases/${yearId}/${c.id}`} aria-label={`Ver clase ${c.title}`} className="absolute inset-0 rounded-xl" />
              <div className="flex flex-wrap gap-1 mb-2">
                {c.levels.map((l) => {
                  const info = CLASS_LEVELS.find((cl) => cl.key === l);
                  if (!info) return null;
                  return (
                    <span
                      key={l}
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: info.bg, color: info.color }}
                    >
                      {info.label}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[14.5px] font-semibold m-0">{c.title}</p>
                {c.video_url && (
                  <span className="flex-none w-[22px] h-[22px] rounded-full bg-[#E8342A] text-white flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                )}
              </div>
              {c.notes && <p className="text-[12.5px] text-text-dim mb-2.5 leading-snug">{truncateText(c.notes, 110)}</p>}
              <div className="flex items-center gap-2.5 text-[11px] text-text-faint mb-1">
                <span>
                  {c.clipCount} clip{c.clipCount === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>
                  {c.materialCount} material{c.materialCount === 1 ? "" : "es"}
                </span>
              </div>
              {canManage && (
                <div className="relative z-10 flex justify-end gap-1 mt-2">
                  <button
                    onClick={() => openEdit(c)}
                    title="Editar clase"
                    className="text-text-faint hover:text-text hover:bg-surface-2 p-1 rounded-md"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    title="Eliminar clase"
                    className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
          <form
            onSubmit={onSave}
            className="bg-surface border border-line rounded-2xl w-full max-w-[520px] p-6 max-h-[88vh] overflow-y-auto"
          >
            <h2 className="font-display text-[19px] mb-4">{editingId ? "Editar clase" : "Nueva clase"}</h2>
            <FieldLabel label="Título">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Clase 1 — Mecánica de 3 árbitros"
                className="w-full"
              />
            </FieldLabel>
            <FieldLabel label="Nivel">
              <div className="flex gap-3 flex-wrap">
                {CLASS_LEVELS.map((l) => (
                  <label key={l.key} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={form.levels.includes(l.key)} onChange={() => toggleFormLevel(l.key)} />
                    {l.label}
                  </label>
                ))}
              </div>
            </FieldLabel>
            <FieldLabel label="Link del video (opcional)">
              <input
                type="url"
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full"
              />
            </FieldLabel>
            <FieldLabel label="Notas (opcional)">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ height: 90 }}
                placeholder="Contenido de la clase, temas tratados..."
                className="w-full"
              />
            </FieldLabel>
            {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={isPending}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                {editingId ? "Guardar cambios" : "Guardar clase"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function FieldLabel({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 mb-3.5 ${className ?? ""}`}>
      <label className="text-[12.5px] text-text-dim font-medium">{label}</label>
      {children}
    </div>
  );
}
