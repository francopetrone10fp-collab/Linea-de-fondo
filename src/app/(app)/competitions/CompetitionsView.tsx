"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ColorBadge } from "@/components/Badge";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { createCompetition, deleteCompetition } from "./actions";

interface Competition {
  id: string;
  name: string;
  color: string;
}

export default function CompetitionsView({
  competitions,
  counts,
  sinCompetenciaCount,
  canDeleteCompetitions,
}: {
  competitions: Competition[];
  counts: Record<string, number>;
  sinCompetenciaCount: number;
  canDeleteCompetitions: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredCompetitions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter((c) => c.name.toLowerCase().includes(q));
  }, [competitions, search]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCompetition(name);
      if (!res.ok) setError(res.error);
      else setName("");
    });
  }

  function onDelete(id: string, competitionName: string) {
    if (!confirm(`¿Eliminar la competencia "${competitionName}"? Los partidos que ya la tienen cargada van a quedar sin competencia.`))
      return;
    startTransition(async () => {
      await deleteCompetition(id);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Competencias ({competitions.length})</h1>
        <form onSubmit={onCreate} className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Asociación Rosarina de Básquet (AROB)"
            className="min-w-[220px]"
          />
          <button
            disabled={isPending}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar competencia
          </button>
        </form>
      </div>
      {error && <p className="text-bad-text text-[12.5px] mb-3">{error}</p>}

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Tocá una competencia para ver sus partidos, agrupados por temporada. Este es el punto de
        entrada a Partidos.
      </div>

      {competitions.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar competencia por nombre..."
            className="min-w-[240px] w-full max-w-[360px]"
          />
        </div>
      )}

      {competitions.length === 0 ? (
        <Empty title="Todavía no hay competencias cargadas" desc="Agregá la primera para empezar el directorio." />
      ) : filteredCompetitions.length === 0 ? (
        <Empty title="Sin resultados" desc={`Ninguna competencia coincide con "${search}".`} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {filteredCompetitions.map((c) => {
            const count = counts[c.id] ?? 0;
            return (
              <div key={c.id} className="relative bg-surface border border-line rounded-[11px] p-3.5 flex items-center gap-2.5 hover:border-text-faint">
                <Link href={`/competitions/${c.id}`} aria-label={`Ver partidos de ${c.name}`} className="absolute inset-0 rounded-[11px]" />
                <ColorBadge name={c.name} color={c.color} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-text-faint">
                    {count} partido{count === 1 ? "" : "s"}
                  </div>
                </div>
                {canDeleteCompetitions && (
                  <button
                    onClick={() => onDelete(c.id, c.name)}
                    title="Eliminar competencia"
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

      {sinCompetenciaCount > 0 && (
        <div className="mt-6">
          <div className="text-[11px] text-text-faint uppercase tracking-wide mb-2.5">Sin agrupar</div>
          <Link
            href="/competitions/sin-competencia"
            className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3 hover:border-text-faint w-fit"
          >
            <span className="w-9 h-9 rounded-[9px] bg-surface-3 text-text-dim flex items-center justify-center flex-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
            </span>
            <div>
              <div className="text-[13.5px] font-semibold">Sin competencia</div>
              <div className="text-[11px] text-text-faint mt-0.5">
                {sinCompetenciaCount} partido{sinCompetenciaCount === 1 ? "" : "s"}
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
