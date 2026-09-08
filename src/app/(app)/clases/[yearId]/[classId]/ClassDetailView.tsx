"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@/app/(app)/teams/TeamsView";
import { CLASS_LEVELS, materialTypeInfo } from "@/lib/constants";
import VideoModal from "@/components/VideoModal";
import {
  createClassClip,
  deleteClass,
  deleteClassClip,
  linkClassMaterial,
  unlinkClassMaterial,
  updateClass,
  updateClassClip,
} from "../../actions";
import type { ClassLevel, MaterialType } from "@/lib/database.types";

interface Clase {
  id: string;
  year_id: string;
  title: string;
  video_url: string | null;
  notes: string | null;
  levels: ClassLevel[];
  created_at: string;
}

interface ClassClip {
  id: string;
  title: string;
  video_url: string | null;
  notes: string | null;
  created_at: string;
}

interface MaterialRow {
  id: string;
  title: string;
  type: MaterialType;
  url: string;
}

export default function ClassDetailView({
  clase,
  clips,
  linkedMaterials,
  availableMaterials,
  canManage,
}: {
  clase: Clase;
  clips: ClassClip[];
  linkedMaterials: MaterialRow[];
  availableMaterials: MaterialRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [videoUrl, setVideoUrl] = useState<{ url: string; title: string } | null>(null);

  const [showEditClass, setShowEditClass] = useState(false);
  const [showAddClip, setShowAddClip] = useState(false);
  const [editingClip, setEditingClip] = useState<ClassClip | null>(null);
  const [showLinkMaterial, setShowLinkMaterial] = useState(false);

  function onDeleteClass() {
    if (!confirm("¿Eliminar esta clase? También se eliminan sus clips y vínculos con material. Esta acción no se puede deshacer."))
      return;
    startTransition(async () => {
      const res = await deleteClass(clase.id, clase.year_id);
      if (res.ok) router.push(`/clases/${clase.year_id}`);
    });
  }

  return (
    <div>
      <div className="flex justify-between items-start gap-4 flex-wrap mb-1.5">
        <div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {clase.levels.map((l) => {
              const info = CLASS_LEVELS.find((cl) => cl.key === l);
              if (!info) return null;
              return (
                <span
                  key={l}
                  className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: info.bg, color: info.color }}
                >
                  {info.label}
                </span>
              );
            })}
          </div>
          <h1 className="font-display text-2xl font-semibold mb-1.5">{clase.title}</h1>
          <p className="text-text-dim text-[13px] m-0">{new Date(clase.created_at).toLocaleDateString("es-AR")}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditClass(true)}
              title="Editar clase"
              className="text-text-faint hover:text-text hover:bg-surface-2 p-1.5 rounded-md"
            >
              <PencilIcon />
            </button>
            <button
              onClick={onDeleteClass}
              disabled={isPending}
              title="Eliminar clase"
              className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1.5 rounded-md"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {clase.video_url && (
        <button
          onClick={() => setVideoUrl({ url: clase.video_url!, title: clase.title })}
          className="mt-3 inline-flex items-center gap-1.5 bg-[#331B1B] hover:bg-[#4a2424] text-[#E8342A] rounded-lg font-semibold text-[13px] px-3.5 py-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Ver video de la clase
        </button>
      )}

      {clase.notes && (
        <p className="text-[13px] text-text-dim my-4 leading-relaxed">
          <b className="text-text-faint">Notas:</b> {clase.notes}
        </p>
      )}

      {/* ---------- Clips ---------- */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim">
            Clips de esta clase ({clips.length})
          </span>
          {canManage && (
            <button
              onClick={() => setShowAddClip(true)}
              className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-1.5"
            >
              + Agregar clip
            </button>
          )}
        </div>
        {clips.length === 0 ? (
          <p className="text-[12.5px] text-text-faint m-0">Todavía no hay clips cargados para esta clase.</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {clips.map((clip) => (
              <div key={clip.id} className="bg-surface border border-line rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-[14px] font-semibold m-0">{clip.title}</p>
                  {clip.video_url && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl({ url: clip.video_url!, title: clip.title })}
                      title="Ver video"
                      className="flex-none w-[24px] h-[24px] rounded-full bg-[#E8342A] hover:bg-[#C92920] text-white flex items-center justify-center"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}
                </div>
                {clip.notes && <p className="text-[12.5px] text-text-dim mb-2.5 leading-snug">{clip.notes}</p>}
                {canManage && (
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditingClip(clip)}
                      title="Editar clip"
                      className="text-text-faint hover:text-text hover:bg-surface-2 p-1 rounded-md"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("¿Eliminar este clip? Esta acción no se puede deshacer.")) return;
                        startTransition(async () => {
                          await deleteClassClip(clip.id);
                          router.refresh();
                        });
                      }}
                      title="Eliminar clip"
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
      </div>

      {/* ---------- Material vinculado ---------- */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-display text-[16px] font-semibold uppercase tracking-wide text-text-dim">
            Material vinculado ({linkedMaterials.length})
          </span>
          {canManage && (
            <button
              onClick={() => setShowLinkMaterial(true)}
              className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-1.5"
            >
              + Vincular material
            </button>
          )}
        </div>
        {linkedMaterials.length === 0 ? (
          <p className="text-[12.5px] text-text-faint m-0">
            Todavía no hay material didáctico vinculado a esta clase.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {linkedMaterials.map((m) => {
              const t = materialTypeInfo(m.type);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 bg-surface border border-line rounded-lg px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-none"
                      style={{ background: t.bg, color: t.color }}
                    >
                      {t.label}
                    </span>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-semibold text-text hover:text-accent overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      {m.title}
                    </a>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => {
                        startTransition(async () => {
                          await unlinkClassMaterial(clase.id, m.id);
                          router.refresh();
                        });
                      }}
                      title="Desvincular material"
                      className="flex-none text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEditClass && (
        <ClassFormModal
          initial={{
            title: clase.title,
            videoUrl: clase.video_url ?? "",
            notes: clase.notes ?? "",
            levels: clase.levels,
          }}
          onSubmit={async (input) => updateClass(clase.id, input)}
          onClose={() => setShowEditClass(false)}
          onSaved={() => {
            setShowEditClass(false);
            router.refresh();
          }}
          title="Editar clase"
          submitLabel="Guardar cambios"
        />
      )}

      {showAddClip && (
        <ClipFormModal
          onSubmit={async (input) => createClassClip(clase.id, input)}
          onClose={() => setShowAddClip(false)}
          onSaved={() => {
            setShowAddClip(false);
            router.refresh();
          }}
          title="Nuevo clip"
          submitLabel="Guardar clip"
        />
      )}

      {editingClip && (
        <ClipFormModal
          initial={{ title: editingClip.title, videoUrl: editingClip.video_url ?? "", notes: editingClip.notes ?? "" }}
          onSubmit={async (input) => updateClassClip(editingClip.id, input)}
          onClose={() => setEditingClip(null)}
          onSaved={() => {
            setEditingClip(null);
            router.refresh();
          }}
          title="Editar clip"
          submitLabel="Guardar cambios"
        />
      )}

      {showLinkMaterial && (
        <LinkMaterialModal
          available={availableMaterials}
          onLink={async (materialId) => {
            const res = await linkClassMaterial(clase.id, materialId);
            if (res.ok) router.refresh();
            return res;
          }}
          onClose={() => setShowLinkMaterial(false)}
        />
      )}

      {videoUrl && <VideoModal url={videoUrl.url} title={videoUrl.title} onClose={() => setVideoUrl(null)} />}
    </div>
  );
}

// ---------- Modal: crear/editar la clase ----------

function ClassFormModal({
  initial,
  onSubmit,
  onClose,
  onSaved,
  title,
  submitLabel,
}: {
  initial?: { title: string; videoUrl: string; notes: string; levels: ClassLevel[] };
  onSubmit: (input: { title: string; videoUrl: string; notes: string; levels: ClassLevel[] }) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onClose: () => void;
  onSaved: () => void;
  title: string;
  submitLabel: string;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    videoUrl: initial?.videoUrl ?? "",
    notes: initial?.notes ?? "",
    levels: initial?.levels ?? ([] as ClassLevel[]),
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleLevel(level: ClassLevel) {
    setForm((f) => ({
      ...f,
      levels: f.levels.includes(level) ? f.levels.filter((l) => l !== level) : [...f.levels, level],
    }));
  }

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(form);
      if (!res.ok) setError(res.error ?? "No se pudo guardar");
      else onSaved();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <form onSubmit={onSubmitForm} className="bg-surface border border-line rounded-2xl w-full max-w-[520px] p-6 max-h-[88vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-4">{title}</h2>
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
                <input type="checkbox" checked={form.levels.includes(l.key)} onChange={() => toggleLevel(l.key)} />
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
          <button type="button" onClick={onClose} className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2">
            Cancelar
          </button>
          <button disabled={isPending} className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Modal: crear/editar un clip de la clase ----------

function ClipFormModal({
  initial,
  onSubmit,
  onClose,
  onSaved,
  title,
  submitLabel,
}: {
  initial?: { title: string; videoUrl: string; notes: string };
  onSubmit: (input: { title: string; videoUrl: string; notes: string }) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  onSaved: () => void;
  title: string;
  submitLabel: string;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    videoUrl: initial?.videoUrl ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(form);
      if (!res.ok) setError(res.error ?? "No se pudo guardar");
      else onSaved();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <form onSubmit={onSubmitForm} className="bg-surface border border-line rounded-2xl w-full max-w-[480px] p-6 max-h-[88vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-4">{title}</h2>
        <FieldLabel label="Título del clip">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ej: Rotación en tiro libre"
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
            style={{ height: 70 }}
            placeholder="Qué muestra este clip..."
            className="w-full"
          />
        </FieldLabel>
        {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}
        <div className="flex justify-end gap-2.5 mt-2">
          <button type="button" onClick={onClose} className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2">
            Cancelar
          </button>
          <button disabled={isPending} className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Modal: vincular material existente ----------

function LinkMaterialModal({
  available,
  onLink,
  onClose,
}: {
  available: MaterialRow[];
  onLink: (materialId: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter((m) => m.title.toLowerCase().includes(q));
  }, [available, search]);

  function onPick(materialId: string) {
    setError(null);
    startTransition(async () => {
      const res = await onLink(materialId);
      if (!res.ok) setError(res.error ?? "No se pudo vincular");
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50" onClick={onClose}>
      <div
        className="bg-surface border border-line rounded-2xl w-full max-w-[480px] p-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-[19px] mb-4">Vincular material didáctico</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar material por título..."
          className="w-full mb-3"
          autoFocus
        />
        {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}
        <div className="overflow-y-auto flex-1 flex flex-col gap-1.5">
          {available.length === 0 ? (
            <p className="text-[12.5px] text-text-faint m-0">
              No hay más material para vincular — ya está todo vinculado a esta clase, o todavía no cargaste
              nada en Material didáctico.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-[12.5px] text-text-faint m-0">Ningún material coincide con &quot;{search}&quot;.</p>
          ) : (
            filtered.map((m) => {
              const t = materialTypeInfo(m.type);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => onPick(m.id)}
                  className="flex items-center gap-2.5 text-left bg-surface-2 hover:bg-surface-3 disabled:opacity-50 rounded-lg px-3 py-2.5"
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-none"
                    style={{ background: t.bg, color: t.color }}
                  >
                    {t.label}
                  </span>
                  <span className="text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap">{m.title}</span>
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button type="button" onClick={onClose} className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2">
            Cerrar
          </button>
        </div>
      </div>
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

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 mb-3.5">
      <label className="text-[12.5px] text-text-dim font-medium">{label}</label>
      {children}
    </div>
  );
}
