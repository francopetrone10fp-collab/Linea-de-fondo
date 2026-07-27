"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { PartidoCard } from "./PartidoCard";
import { refereesText } from "./partidoHelpers";
import PartidoFormModal from "./PartidoFormModal";
import type { PartidoFull } from "./queries";
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
  categoryFilterOptions = [],
  defaultCompetitionId,
  defaultSeasonId,
  canCreateCompetitions = true,
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
  categoryFilterOptions?: { id: string; name: string }[];
  defaultCompetitionId?: string;
  defaultSeasonId?: string | null;
  canCreateCompetitions?: boolean;
  title: string;
  canCreate: boolean;
  canFilterByReferee: boolean;
  showReadStatus: boolean;
}) {
  const [refFilter, setRefFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    let list = partidos;
    if (canFilterByReferee && refFilter.trim()) {
      const q = refFilter.trim().toLowerCase();
      list = list.filter((p) => refereesText(p).toLowerCase().includes(q));
    }
    if (categoryFilter.length > 0) {
      list = list.filter((p) => !!p.category && categoryFilter.includes(p.category.id));
    }
    return list;
  }, [partidos, refFilter, canFilterByReferee, categoryFilter]);

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

      {(canFilterByReferee || categoryFilterOptions.length > 0) && (
        <div className="flex gap-2.5 flex-wrap mb-5">
          {canFilterByReferee && (
            <input
              type="text"
              value={refFilter}
              onChange={(e) => setRefFilter(e.target.value)}
              placeholder="Buscar por árbitro..."
              className="min-w-[240px]"
            />
          )}
          {categoryFilterOptions.length > 0 && (
            <CategoryMultiSelect
              options={categoryFilterOptions}
              selected={categoryFilter}
              onChange={setCategoryFilter}
            />
          )}
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
                canCreateCompetitions={canCreateCompetitions}
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
          defaultCompetitionId={defaultCompetitionId}
          defaultSeasonId={defaultSeasonId}
          canCreateCompetitions={canCreateCompetitions}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Filtro desplegable con multi-selección para las categorías de la
// competencia que se está viendo (cierra al tocar afuera).
function CategoryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const label =
    selected.length === 0
      ? "Todas las categorías"
      : selected.length === 1
        ? (options.find((o) => o.id === selected[0])?.name ?? "1 categoría")
        : `${selected.length} categorías`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-w-[200px] bg-surface border border-line rounded-lg text-[13px] px-3 py-2 flex items-center justify-between gap-2"
      >
        <span className={selected.length ? "text-text" : "text-text-dim"}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="flex-none text-text-faint">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 min-w-[220px] max-h-[280px] overflow-y-auto bg-surface border border-line rounded-lg shadow-lg py-1.5">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left text-[12.5px] text-accent px-3 py-1.5 hover:bg-surface-2"
            >
              Limpiar selección
            </button>
          )}
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-surface-2 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
              {o.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
