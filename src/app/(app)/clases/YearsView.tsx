"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { createClassYear, deleteClassYear } from "./actions";

interface Year {
  id: string;
  name: string;
}

export default function YearsView({
  years,
  counts,
  canManage,
}: {
  years: Year[];
  counts: Record<string, number>;
  canManage: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createClassYear(name);
      if (!res.ok) setError(res.error);
      else setName("");
    });
  }

  function onDelete(id: string, yearName: string) {
    if (
      !confirm(
        `¿Eliminar el año "${yearName}"? Se van a eliminar también todas sus clases, clips y vínculos con material. Esta acción no se puede deshacer.`
      )
    )
      return;
    startTransition(async () => {
      await deleteClassYear(id);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Clases</h1>
        {canManage && (
          <form onSubmit={onCreate} className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: 2026"
              className="min-w-[140px]"
            />
            <button
              disabled={isPending}
              className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
            >
              + Agregar año
            </button>
          </form>
        )}
      </div>
      {error && <p className="text-bad-text text-[12.5px] mb-3">{error}</p>}

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Tocá un año para ver sus clases. Cada clase puede tener video, notas, clips propios y
        material didáctico vinculado.
      </div>

      {years.length === 0 ? (
        <Empty
          title="Todavía no hay años cargados"
          desc={canManage ? "Agregá el primero para empezar a cargar clases." : ""}
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {years.map((y) => {
            const count = counts[y.id] ?? 0;
            return (
              <div
                key={y.id}
                className="relative bg-surface border border-line rounded-[11px] p-3.5 flex items-center gap-2.5 hover:border-text-faint"
              >
                <Link href={`/clases/${y.id}`} aria-label={`Ver clases de ${y.name}`} className="absolute inset-0 rounded-[11px]" />
                <span className="w-9 h-9 rounded-[9px] bg-surface-3 text-accent flex items-center justify-center flex-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-display font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {y.name}
                  </div>
                  <div className="text-[11px] text-text-faint">
                    {count} clase{count === 1 ? "" : "s"}
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => onDelete(y.id, y.name)}
                    title="Eliminar año"
                    className="relative z-10 text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
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
  );
}
