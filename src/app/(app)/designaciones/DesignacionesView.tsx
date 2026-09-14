"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DesignacionesGrid from "./DesignacionesGrid";
import DesignacionFormModal from "./DesignacionFormModal";
import TarifasView from "./TarifasView";
import MisDesignacionesView from "./MisDesignacionesView";
import type { Companero, DesignacionFull, TarifaCategoria, ViaticoLocalidad } from "./queries";

export default function DesignacionesView({
  designaciones,
  tarifas,
  viaticos,
  companeros,
  referees,
  canManage,
  myRefereeId,
  month,
}: {
  designaciones: DesignacionFull[];
  tarifas: TarifaCategoria[];
  viaticos: ViaticoLocalidad[];
  companeros: Record<string, Companero[]>;
  referees: { id: string; name: string }[];
  canManage: boolean;
  myRefereeId: string | null;
  month: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"grilla" | "mias" | "aranceles">(canManage ? "grilla" : "mias");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DesignacionFull | null>(null);

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    router.push(`/designaciones?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [month]);

  const competencias = useMemo(
    () => Array.from(new Set(designaciones.map((d) => d.competencia).filter((c): c is string => !!c))),
    [designaciones]
  );
  const localidades = useMemo(() => viaticos.map((v) => v.localidad), [viaticos]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return designaciones;
    return designaciones.filter((d) =>
      [d.jornada, d.categoria, d.competencia, d.equipoLocal, d.equipoVisitante, d.sede, d.ctNombre, ...d.arbitros.map((a) => a.refereeName)]
        .filter((v): v is string => !!v)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [designaciones, q]);

  return (
    <div>
      <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1.5">Designaciones</h1>
          <p className="text-text-dim text-[13px] m-0">Partidos designados a árbitros y lo que cobra cada uno.</p>
        </div>
        {canManage && tab === "grilla" && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Nueva designación
          </button>
        )}
      </div>

      {canManage && (
        <div className="flex gap-1 mb-4 border-b border-line">
          <TabButton active={tab === "grilla"} onClick={() => setTab("grilla")}>
            Grilla
          </TabButton>
          <TabButton active={tab === "mias"} onClick={() => setTab("mias")}>
            Mis designaciones
          </TabButton>
          <TabButton active={tab === "aranceles"} onClick={() => setTab("aranceles")}>
            Aranceles
          </TabButton>
        </div>
      )}

      {tab !== "aranceles" && (
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-lg px-1 py-1">
            <button onClick={() => changeMonth(-1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Mes anterior">
              ‹
            </button>
            <span className="text-[13px] font-medium px-1.5 min-w-[130px] text-center capitalize">{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Mes siguiente">
              ›
            </button>
          </div>
          {tab === "grilla" && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por equipo, árbitro, sede, categoría..."
              className="flex-1 min-w-[220px]"
            />
          )}
        </div>
      )}

      {tab === "grilla" && canManage && (
        <DesignacionesGrid designaciones={filtered} referees={referees} onEdit={(d) => setEditing(d)} />
      )}

      {tab === "mias" &&
        (myRefereeId ? (
          <MisDesignacionesView designaciones={designaciones} myRefereeId={myRefereeId} viaticos={viaticos} companeros={companeros} />
        ) : (
          <p className="text-[12.5px] text-text-faint m-0">
            Tu perfil todavía no está vinculado a un árbitro, así que no podemos mostrarte tus designaciones.
          </p>
        ))}

      {tab === "aranceles" && canManage && <TarifasView tarifas={tarifas} viaticos={viaticos} />}

      {(showCreate || editing) && (
        <DesignacionFormModal
          mode={editing ? "edit" : "create"}
          designacion={editing ?? undefined}
          tarifas={tarifas}
          competencias={competencias}
          localidades={localidades}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
        />
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
