"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MiDisponibilidadView from "./MiDisponibilidadView";
import DisponibilidadMatrix from "./DisponibilidadMatrix";
import { addDays, formatWeekRange } from "./weekUtils";
import type { DisponibilidadDia } from "./queries";

export default function DisponibilidadView({
  monday,
  disponibilidadPorArbitro,
  referees,
  canManage,
  myRefereeId,
}: {
  monday: string;
  disponibilidadPorArbitro: Record<string, DisponibilidadDia[]>;
  referees: { id: string; name: string }[];
  canManage: boolean;
  myRefereeId: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"matriz" | "mia">(canManage ? "matriz" : "mia");

  function changeWeek(delta: number) {
    router.push(`/disponibilidad?semana=${addDays(monday, delta * 7)}`);
  }

  return (
    <div>
      <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1.5">Disponibilidad</h1>
          <p className="text-text-dim text-[13px] m-0">
            {canManage
              ? "Quién está disponible esta semana y para qué categoría el fin de semana."
              : "Cargá tu disponibilidad de esta semana para que te puedan designar."}
          </p>
        </div>
      </div>

      {canManage && myRefereeId && (
        <div className="flex gap-1 mb-4 border-b border-line">
          <TabButton active={tab === "matriz"} onClick={() => setTab("matriz")}>
            Matriz
          </TabButton>
          <TabButton active={tab === "mia"} onClick={() => setTab("mia")}>
            Mi disponibilidad
          </TabButton>
        </div>
      )}

      <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-lg px-1 py-1 mb-4 w-fit">
        <button onClick={() => changeWeek(-1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Semana anterior">
          ‹
        </button>
        <span className="text-[13px] font-medium px-1.5 min-w-[190px] text-center">Semana del {formatWeekRange(monday)}</span>
        <button onClick={() => changeWeek(1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Semana siguiente">
          ›
        </button>
      </div>

      {(!canManage || tab === "mia") &&
        (myRefereeId ? (
          <MiDisponibilidadView monday={monday} miDisponibilidad={disponibilidadPorArbitro[myRefereeId] ?? []} />
        ) : (
          <p className="text-[12.5px] text-text-faint m-0">
            Tu perfil todavía no está vinculado a un árbitro, así que no podemos mostrarte tu disponibilidad.
          </p>
        ))}

      {canManage && tab === "matriz" && (
        <DisponibilidadMatrix monday={monday} referees={referees} disponibilidadPorArbitro={disponibilidadPorArbitro} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px ${
        active ? "border-accent text-text" : "border-transparent text-text-dim hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
