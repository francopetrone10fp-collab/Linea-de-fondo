"use client";

import { useMemo, useState } from "react";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { PartidoCard } from "../PartidoCard";
import { refereesText } from "../partidoHelpers";
import PartidoFormModal from "../PartidoFormModal";
import type { PartidoFull } from "../queries";
import type { Evaluation } from "@/lib/database.types";

interface MinimalClip {
  id: string;
  partido_id: string;
  situation: string;
  evaluation: Evaluation | null;
  referee_id: string | null;
}

const EMPTY_COUNTS: Record<Evaluation, number> = { mala: 0, estandar: 0, buena: 0, relevante: 0 };

export default function TemporadaListView({
  temporada,
  partidos,
  clipsByPartido,
  readRefereeIdsByPartido,
  teams,
  referees,
  categories,
  competitions,
  defaultCategoryId,
  title,
  canCreate,
  canFilterByReferee,
  showReadStatus,
}: {
  temporada: string;
  partidos: PartidoFull[];
  clipsByPartido: Record<string, MinimalClip[]>;
  readRefereeIdsByPartido: Record<string, string[]>;
  teams: { id: string; name: string }[];
  referees: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  competitions: { id: string; name: string }[];
  defaultCategoryId?: string;
  title: string;
  canCreate: boolean;
  canFilterByReferee: boolean;
  showReadStatus: boolean;
}) {
  const [refFilter, setRefFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    if (!canFilterByReferee || !refFilter.trim()) return partidos;
    const q = refFilter.trim().toLowerCase();
    return partidos.filter((p) => refereesText(p).toLowerCase().includes(q));
  }, [partidos, refFilter, canFilterByReferee]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar partido
          </button>
        )}
      </div>

      {canFilterByReferee && (
        <div className="mb-5">
          <input
            type="text"
            value={refFilter}
            onChange={(e) => setRefFilter(e.target.value)}
            placeholder="Buscar por árbitro..."
            className="min-w-[240px]"
          />
        </div>
      )}

      {partidos.length === 0 ? (
        <Empty
          title="No hay partidos acá"
          desc={canCreate ? "Registrá el primero para empezar el historial." : ""}
        />
      ) : filtered.length === 0 ? (
        <Empty title="Sin resultados" desc="Ningún partido coincide con esos filtros." />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {filtered.map((p) => {
            const clips = clipsByPartido[p.id] ?? [];
            const counts = { ...EMPTY_COUNTS };
            let pending = 0;
            clips.forEach((c) => {
              if (c.evaluation) counts[c.evaluation]++;
              else pending++;
            });
            const readCount = showReadStatus
              ? p.referees.filter((r) => (readRefereeIdsByPartido[p.id] ?? []).includes(r.id)).length
              : undefined;
            return (
              <PartidoCard
                key={p.id}
                p={p}
                temporada={temporada}
                evalCounts={counts}
                pendingCount={pending}
                readStatus={showReadStatus ? { confirmed: readCount!, total: p.referees.length } : undefined}
                canManage={canCreate}
                teams={teams}
                referees={referees}
                categories={categories}
                competitions={competitions}
              />
            );
          })}
        </div>
      )}

      {showModal && (
        <PartidoFormModal
          mode="create"
          teams={teams}
          referees={referees}
          categories={categories}
          competitions={competitions}
          defaultCategoryId={defaultCategoryId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
