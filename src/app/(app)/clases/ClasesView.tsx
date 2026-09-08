"use client";

import { useMemo, useState, useTransition } from "react";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { truncateText } from "@/lib/constants";
import { createClass, deleteClass, updateClass } from "./actions";
import VideoModal from "@/components/VideoModal";

interface Clase {
  id: string;
  title: string;
  video_url: string | null;
  notes: string | null;
  created_at: string;
  createdByName: string;
}

export default function ClasesView({ classes, canManage }: { classes: Clase[]; canManage: boolean }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [videoClase, setVideoClase] = useState<Clase | null>(null);
  const [form, setForm] = useState({ title: "", videoUrl: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.title.toLowerCase().includes(q));
  }, [classes, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ title: "", videoUrl: "", notes: "" });
    setError(null);
    setShowModal(true);
  }

  function openEdit(c: Clase) {
    setEditingId(c.id);
    setForm({ title: c.title, videoUrl: c.video_url ?? "", notes: c.notes ?? "" });
    setError(null);
    setShowModal(true);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = editingId ? await updateClass(editingId, form) : await createClass(form);
      if (!res.ok) setError(res.error);
      else {
        setShowModal(false);
        setEditingId(null);
        setForm({ title: "", videoUrl: "", notes: "" });
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta clase? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await deleteClass(id);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Clases</h1>
        {canManage && (
          <button
            onClick={openCreate}
            className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar clase
          </button>
        )}
      </div>

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Clases armadas por Coordinador General e Instructor, con video y notas — visibles para todo
        el equipo.
      </div>

      {classes.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clase por título..."
            className="min-w-[240px] w-full max-w-[360px]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          title={classes.length === 0 ? "Todavía no hay clases cargadas" : "Sin resultados"}
          desc={
            classes.length === 0
              ? canManage
                ? "Armá la primera clase para el equipo."
                : ""
              : `Ninguna clase coincide con "${search}".`
          }
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {filtered.map((c) => (
            <div key={c.id} className="bg-surface border border-line rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[14.5px] font-semibold m-0">{c.title}</p>
                {c.video_url && (
                  <button
                    type="button"
                    onClick={() => setVideoClase(c)}
                    title="Ver video"
                    className="flex-none w-[26px] h-[26px] rounded-full bg-[#E8342A] hover:bg-[#C92920] text-white flex items-center justify-center"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
              </div>
              {c.notes && (
                <p className="text-[12.5px] text-text-dim mb-2.5 leading-snug">{truncateText(c.notes, 140)}</p>
              )}
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-text-faint m-0">
                  {c.createdByName} · {new Date(c.created_at).toLocaleDateString("es-AR")}
                </p>
                {canManage && (
                  <div className="flex gap-1">
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
                placeholder="Ej: Mecánica de 3 árbitros — introducción"
                className="w-full"
              />
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
                style={{ height: 100 }}
                placeholder="Contenido de la clase, temas tratados, conclusiones..."
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

      {videoClase && videoClase.video_url && (
        <VideoModal url={videoClase.video_url} title={videoClase.title} onClose={() => setVideoClase(null)} />
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
