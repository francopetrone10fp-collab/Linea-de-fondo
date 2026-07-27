"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { createSeason } from "@/app/(app)/competitions/actions";

export default function CompetitionSeasonsView({
  competitionId,
  title,
  seasons,
  counts,
  canCreate,
}: {
  competitionId: string;
  title: string;
  seasons: string[];
  counts: Record<string, number>;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createSeason(competitionId, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowModal(false);
      setName("");
      router.push(`/competitions/${encodeURIComponent(competitionId)}/${encodeURIComponent(res.season.name)}`);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar temporada
          </button>
        )}
      </div>

      {seasons.length === 0 ? (
        <Empty
          title="No hay temporadas acá"
          desc={canCreate ? "Creá la primera para empezar a cargar partidos." : ""}
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {seasons.map((season) => (
            <Link
              key={season}
              href={`/competitions/${encodeURIComponent(competitionId)}/${encodeURIComponent(season)}`}
              className="bg-surface border border-line rounded-xl p-5 flex items-center gap-3.5 hover:border-text-faint"
            >
              <span className="w-11 h-11 rounded-[10px] bg-surface-3 text-accent flex items-center justify-center flex-none">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
              </span>
              <div>
                <div className="font-display text-[17px] font-semibold">
                  {season === "Sin fecha" ? "Sin fecha" : `Temporada ${season}`}
                </div>
                <div className="text-[12px] text-text-faint mt-0.5">
                  {counts[season] ?? 0} partido{(counts[season] ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
          <form onSubmit={onCreate} className="bg-surface border border-line rounded-2xl w-full max-w-[420px] p-6">
            <h2 className="font-display text-[19px] mb-4">Nueva temporada</h2>
            <div className="flex flex-col gap-1 mb-3.5">
              <label className="text-[12.5px] text-text-dim font-medium">Nombre de la temporada</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: 2026"
                className="w-full"
                autoFocus
              />
            </div>
            {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                  setName("");
                }}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={isPending || !name.trim()}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Crear temporada
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
