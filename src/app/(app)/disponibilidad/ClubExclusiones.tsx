"use client";

import { useMemo, useTransition } from "react";
import { ColorBadge } from "@/components/Badge";
import { addClubExclusion, removeClubExclusion } from "./actions";

interface TeamLite {
  id: string;
  name: string;
  color: string;
  photo_url: string | null;
}

// A diferencia de la disponibilidad (que es semana a semana), esto es una
// preferencia estable del árbitro: queda cargada hasta que él mismo la
// cambie, y se usa para bloquear su designación a ese club (ver
// setDesignacionArbitro y DesignacionesGrid).
export default function ClubExclusiones({ teams, exclusions }: { teams: TeamLite[]; exclusions: TeamLite[] }) {
  const [isPending, startTransition] = useTransition();

  const disponibles = useMemo(() => {
    const excludedIds = new Set(exclusions.map((t) => t.id));
    return teams.filter((t) => !excludedIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [teams, exclusions]);

  function onAdd(teamId: string) {
    if (!teamId) return;
    startTransition(async () => {
      await addClubExclusion(teamId);
    });
  }

  function onRemove(teamId: string) {
    startTransition(async () => {
      await removeClubExclusion(teamId);
    });
  }

  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-3 mb-1">
      <p className="text-[13.5px] font-semibold m-0 mb-1">Clubes que no dirijo</p>
      <p className="text-[12px] text-text-dim m-0 mb-2.5">
        Marcá los clubes a los que no podés dirigir (por ejemplo, si sos socio o tenés un familiar en el plantel). Queda
        guardado hasta que vos mismo lo cambies — no hace falta repetirlo cada semana.
      </p>

      {exclusions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {exclusions.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-full pl-1.5 pr-2 py-1 text-[12px]">
              <ColorBadge name={t.name} color={t.color} photoUrl={t.photo_url} size={18} />
              {t.name}
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                disabled={isPending}
                title="Quitar"
                className="text-text-faint hover:text-bad-text ml-0.5 disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <select
        value=""
        disabled={isPending || disponibles.length === 0}
        onChange={(e) => onAdd(e.target.value)}
        className="text-[12.5px] max-w-[280px]"
      >
        <option value="">+ Agregar club...</option>
        {disponibles.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
