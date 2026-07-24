"use client";

import { useMemo, useState, useTransition } from "react";
import { ColorBadge } from "@/components/Badge";
import { createTeam, deleteTeam } from "./actions";

interface Team {
  id: string;
  name: string;
  color: string;
}

export default function TeamsView({
  teams,
  counts,
  canDeleteTeams,
}: {
  teams: Team[];
  counts: Record<string, number>;
  canDeleteTeams: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, search]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTeam(name);
      if (!res.ok) setError(res.error);
      else setName("");
    });
  }

  function onDelete(id: string, teamName: string) {
    if (!confirm(`¿Eliminar el equipo "${teamName}"? Los clips que ya lo tienen cargado van a quedar sin insignia.`)) return;
    startTransition(async () => {
      await deleteTeam(id);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Equipos ({teams.length})</h1>
        <form onSubmit={onCreate} className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Náutico Sportivo Avellaneda"
            className="min-w-[220px]"
          />
          <button
            disabled={isPending}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar equipo
          </button>
        </form>
      </div>
      {error && <p className="text-bad-text text-[12.5px] mb-3">{error}</p>}

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Este directorio arranca con los clubes de Superliga confirmados. Sumá los que falten —
        las insignias son generadas (iniciales + color), no los escudos oficiales de los clubes.
      </div>

      {teams.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo por nombre..."
            className="min-w-[240px] w-full max-w-[360px]"
          />
        </div>
      )}

      {teams.length === 0 ? (
        <Empty title="Todavía no hay equipos cargados" desc="Agregá el primero para empezar el directorio." />
      ) : filteredTeams.length === 0 ? (
        <Empty title="Sin resultados" desc={`Ningún equipo coincide con "${search}".`} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {filteredTeams.map((t) => {
            const count = counts[t.id] ?? 0;
            return (
              <div key={t.id} className="bg-surface border border-line rounded-[11px] p-3.5 flex items-center gap-2.5">
                <ColorBadge name={t.name} color={t.color} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-text-faint">
                    {count} clip{count === 1 ? "" : "s"}
                  </div>
                </div>
                {canDeleteTeams && (
                  <button
                    onClick={() => onDelete(t.id, t.name)}
                    title="Eliminar equipo"
                    className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
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

export function Empty({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-20 px-5 text-text-dim">
      <h3 className="font-display text-xl text-text mb-1.5">{title}</h3>
      <p className="text-[14px] max-w-[360px] mx-auto mb-4">{desc}</p>
      {action}
    </div>
  );
}

export function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
