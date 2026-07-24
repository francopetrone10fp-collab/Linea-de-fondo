"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ColorBadge } from "@/components/Badge";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { createReferee, deleteReferee, mergeReferees, updateRefereePhotoUrl } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { resizeImageToBlob } from "@/components/Sidebar";

interface Referee {
  id: string;
  name: string;
  color: string;
  photo_url: string | null;
}

export default function RefereesView({
  referees,
  counts,
  canDeleteReferees,
  canManage,
  myRefereeId,
}: {
  referees: Referee[];
  counts: Record<string, number>;
  canDeleteReferees: boolean;
  canManage: boolean;
  myProfileId: string;
  myRefereeId: string | null;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState<Referee | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filteredReferees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referees;
    return referees.filter((r) => r.name.toLowerCase().includes(q));
  }, [referees, search]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createReferee(name);
      if (!res.ok) setError(res.error);
      else setName("");
    });
  }

  function onDelete(id: string, refName: string) {
    if (!confirm(`¿Eliminar a "${refName}" del directorio? Sus clips ya cargados no se borran.`)) return;
    startTransition(async () => {
      await deleteReferee(id);
    });
  }

  function onPhotoChange(id: string, file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      try {
        const blob = await resizeImageToBlob(file, 240);
        const supabase = createClient();
        const path = `referees/${id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (uploadError) return;
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        await updateRefereePhotoUrl(id, `${publicUrl}?v=${Date.now()}`);
      } catch {
        // ignoramos archivos inválidos
      }
    });
  }

  function confirmMerge() {
    if (!mergeSource || !mergeTarget) return;
    const targetName = referees.find((r) => r.id === mergeTarget)?.name ?? "";
    if (
      !confirm(
        `¿Pasar todos los clips y partidos de "${mergeSource.name}" a "${targetName}", y borrar "${mergeSource.name}" del directorio? Esta acción no se puede deshacer.`
      )
    )
      return;
    startTransition(async () => {
      await mergeReferees(mergeSource.id, mergeTarget);
      setMergeSource(null);
      setMergeTarget("");
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Árbitros ({referees.length})</h1>
        <form onSubmit={onCreate} className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Martina Gómez"
            className="min-w-[220px]"
          />
          <button
            disabled={isPending}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar árbitro
          </button>
        </form>
      </div>
      {error && <p className="text-bad-text text-[12.5px] mb-3">{error}</p>}

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Directorio de árbitros para asignar en cada clip. Cuando un árbitro crea su perfil de
        acceso, se suma acá automáticamente.
      </div>

      {referees.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar árbitro por nombre..."
            className="min-w-[240px] w-full max-w-[360px]"
          />
        </div>
      )}

      {referees.length === 0 ? (
        <Empty title="Todavía no hay árbitros cargados" desc="Se suman solos cuando alguien crea su perfil de acceso." />
      ) : filteredReferees.length === 0 ? (
        <Empty title="Sin resultados" desc={`Ningún árbitro coincide con "${search}".`} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {filteredReferees.map((r) => {
            const count = counts[r.id] ?? 0;
            const canChangePhoto = canManage || r.id === myRefereeId;
            return (
              <div key={r.id} className="relative bg-surface border border-line rounded-[11px] p-3.5 flex items-center gap-2.5">
                {canManage && (
                  <Link
                    href={`/referees/${r.id}`}
                    aria-label={`Ver perfil de ${r.name}`}
                    className="absolute inset-0 rounded-[11px] hover:border-text-faint"
                  />
                )}
                <button
                  type="button"
                  disabled={!canChangePhoto}
                  onClick={() => fileRefs.current[r.id]?.click()}
                  title={canChangePhoto ? "Cambiar foto" : undefined}
                  className={`relative z-10 ${canChangePhoto ? "cursor-pointer" : "cursor-default"}`}
                >
                  <ColorBadge name={r.name} color={r.color} photoUrl={r.photo_url} size={34} />
                </button>
                {canChangePhoto && (
                  <input
                    ref={(el) => {
                      fileRefs.current[r.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPhotoChange(r.id, e.target.files?.[0])}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {r.name}
                  </div>
                  <div className="text-[11px] text-text-faint">
                    {count} clip{count === 1 ? "" : "s"}
                  </div>
                </div>
                {canDeleteReferees && (
                  <>
                    <button
                      onClick={() => setMergeSource(r)}
                      title="Fusionar con otro árbitro"
                      className="relative z-10 text-text-faint hover:text-text hover:bg-surface-3 p-1 rounded-md"
                    >
                      <MergeIcon />
                    </button>
                    <button
                      onClick={() => onDelete(r.id, r.name)}
                      title="Eliminar árbitro"
                      className="relative z-10 text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
                    >
                      <TrashIcon />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mergeSource && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-[400px] p-6">
            <h2 className="font-display text-lg mb-2.5">Fusionar árbitro duplicado</h2>
            <p className="text-[13px] text-text-dim mb-3.5">
              &quot;{mergeSource.name}&quot; es un duplicado. Elegí con quién unificarlo — sus clips y
              partidos van a pasar a esa persona.
            </p>
            <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="w-full mb-4">
              <option value="">Elegí un árbitro...</option>
              {referees
                .filter((r) => r.id !== mergeSource.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setMergeSource(null);
                  setMergeTarget("");
                }}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMerge}
                disabled={!mergeTarget || isPending}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Fusionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MergeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
