"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DesignacionesGrid from "./DesignacionesGrid";
import DesignacionFormModal from "./DesignacionFormModal";
import TarifasView from "./TarifasView";
import MisDesignacionesView from "./MisDesignacionesView";
import ImportModal from "./ImportModal";
import { downloadCsv } from "@/lib/csv";
import SectionIcon from "@/components/SectionIcon";
import { buildDesignacionesDetalleHtml, buildDesignacionesTotalesHtml, openHtmlForPrint } from "./reportHtml";
import type { Companero, Confirmacion, DesignacionFull, TarifaCategoria, ViaticoLocalidad } from "./queries";
import type { DisponibilidadDia } from "../disponibilidad/queries";

export default function DesignacionesView({
  designaciones,
  tarifas,
  viaticos,
  companeros,
  confirmaciones,
  disponibilidadPorArbitro,
  referees,
  teams,
  canManage,
  myRefereeId,
  month,
  desde,
  hasta,
  customRange,
}: {
  designaciones: DesignacionFull[];
  tarifas: TarifaCategoria[];
  viaticos: ViaticoLocalidad[];
  companeros: Record<string, Companero[]>;
  confirmaciones: Record<string, Confirmacion[]>;
  disponibilidadPorArbitro: Record<string, DisponibilidadDia[]>;
  referees: { id: string; name: string }[];
  teams: { id: string; name: string; color: string; photo_url: string | null }[];
  canManage: boolean;
  myRefereeId: string | null;
  month: string;
  desde: string;
  hasta: string;
  customRange: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"grilla" | "mias" | "aranceles">(canManage ? "grilla" : "mias");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<DesignacionFull | null>(null);
  const [selectedDay, setSelectedDay] = useState("");

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    router.push(`/designaciones?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function applyRange(nextDesde: string, nextHasta: string) {
    if (nextDesde && nextHasta && nextDesde <= nextHasta) {
      router.push(`/designaciones?desde=${nextDesde}&hasta=${nextHasta}`);
    }
  }

  function clearRange() {
    router.push("/designaciones");
  }

  function onDayChange(day: string) {
    setSelectedDay(day);
    if (day && day.slice(0, 7) !== month) {
      router.push(`/designaciones?month=${day.slice(0, 7)}`);
    }
  }

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [month]);

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  // Con rango personalizado, el título y los nombres de archivo reflejan el
  // período exacto elegido en vez del mes calendario.
  const rangeLabel = customRange ? `${formatDate(desde)} – ${formatDate(hasta)}` : monthLabel;
  const rangeSlug = customRange ? `${desde}_a_${hasta}` : month;

  const competencias = useMemo(() => {
    const desdeDatos = designaciones.map((d) => d.competencia).filter((c): c is string => !!c);
    return Array.from(new Set(["AROB", "LFF", "FBPS", ...desdeDatos]));
  }, [designaciones]);
  const localidades = useMemo(() => viaticos.map((v) => v.localidad), [viaticos]);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pendiente de confirmación = tiene árbitros asignados pero no confirmaron
  // todos. Estas van siempre arriba, sin importar el orden por fecha.
  function estaPendiente(d: DesignacionFull) {
    if (!d.requiereConfirmacion || d.arbitros.length === 0) return false;
    if (d.estado === "suspendido" || d.estado === "jugado") return false;
    const confirmados = confirmaciones[d.id] ?? [];
    return !d.arbitros.every((a) => confirmados.some((c) => c.refereeId === a.refereeId));
  }

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = designaciones;
    if (selectedDay) {
      list = list.filter((d) => d.fecha === selectedDay);
    }
    if (q) {
      list = list.filter((d) =>
        [d.jornada, d.categoria, d.competencia, d.equipoLocal, d.equipoVisitante, d.sede, d.ctNombre, d.notas, ...d.arbitros.map((a) => a.refereeName)]
          .filter((v): v is string => !!v)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    // Agrupa en "tiras" los partidos del mismo día entre el mismo local y
    // visitante (categorías distintas jugadas seguidas en la misma cancha) y
    // los deja siempre juntos y en orden cronológico dentro del grupo — así
    // en la grilla y en el PDF exportado, los árbitros ven quién juega justo
    // antes o después para coordinar un reemplazo.
    function agruparEnTiras(items: DesignacionFull[]) {
      const porBloque = new Map<string, DesignacionFull[]>();
      const clavesEnOrden: string[] = [];
      for (const d of items) {
        const clave = `${d.fecha ?? ""}|${d.equipoLocal}|${d.equipoVisitante}`;
        if (!porBloque.has(clave)) {
          porBloque.set(clave, []);
          clavesEnOrden.push(clave);
        }
        porBloque.get(clave)!.push(d);
      }
      const bloques = clavesEnOrden.map((clave) => {
        const rows = [...porBloque.get(clave)!].sort((a, b) => (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"));
        return { fecha: rows[0]?.fecha ?? "", horaMin: rows[0]?.hora ?? "99:99", rows };
      });
      bloques.sort((a, b) => {
        const av = `${a.fecha} ${a.horaMin}`;
        const bv = `${b.fecha} ${b.horaMin}`;
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      return bloques.flatMap((b) => b.rows);
    }

    const pendientes = list.filter(estaPendiente);
    const resto = list.filter((d) => !estaPendiente(d));
    return [...agruparEnTiras(pendientes), ...agruparEnTiras(resto)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designaciones, q, sortOrder, confirmaciones, selectedDay]);

  const pendingIds = useMemo(() => new Set(filtered.filter(estaPendiente).map((d) => d.id)), [filtered, confirmaciones]); // eslint-disable-line react-hooks/exhaustive-deps

  const misDesignaciones = useMemo(
    () => (selectedDay ? designaciones.filter((d) => d.fecha === selectedDay) : designaciones),
    [designaciones, selectedDay]
  );

  // Todos los partidos asignados a cada árbitro (fecha, hora, id de la
  // designación), armado desde la lista completa sin filtrar para no
  // perderse choques que el buscador o el filtro de día esconderían. Sirve
  // tanto para bloquear un segundo partido el mismo día como para el aviso
  // informativo de partidos en otras fechas.
  const assignmentsByReferee = useMemo(() => {
    const map = new Map<string, { fecha: string; hora: string | null; designacionId: string }[]>();
    for (const d of designaciones) {
      if (!d.fecha) continue;
      for (const a of d.arbitros) {
        if (!map.has(a.refereeId)) map.set(a.refereeId, []);
        map.get(a.refereeId)!.push({ fecha: d.fecha, hora: d.hora, designacionId: d.id });
      }
    }
    return map;
  }, [designaciones]);

  function exportDetalle() {
    const headers = [
      "Fecha",
      "Hora",
      "Jornada",
      "Categoría",
      "Competencia",
      "Rama",
      "Local",
      "Visitante",
      "Sede",
      "Localidad",
      "Estado",
      "Árbitro 1",
      "Monto 1",
      "Árbitro 2",
      "Monto 2",
      "Árbitro 3",
      "Monto 3",
      "Comisionado técnico",
      "Monto CT",
      "Notas",
    ];
    const rows = filtered.map((d) => {
      const a = (pos: number) => d.arbitros.find((x) => x.posicion === pos);
      return [
        d.fecha,
        d.hora?.slice(0, 5),
        d.jornada,
        d.categoria,
        d.competencia,
        d.rama,
        d.equipoLocal,
        d.equipoVisitante,
        d.sede,
        d.localidad,
        d.estado,
        a(1)?.refereeName,
        a(1)?.monto,
        a(2)?.refereeName,
        a(2)?.monto,
        a(3)?.refereeName,
        a(3)?.monto,
        d.ctNombre,
        d.ctMonto,
        d.notas,
      ];
    });
    downloadCsv(`designaciones_${rangeSlug}.csv`, headers, rows);
  }

  function computeTotales() {
    const totals = new Map<string, { nombre: string; partidos: number; total: number }>();
    designaciones.forEach((d) => {
      d.arbitros.forEach((a) => {
        const entry = totals.get(a.refereeId) ?? { nombre: a.refereeName, partidos: 0, total: 0 };
        entry.partidos += 1;
        entry.total += a.monto;
        totals.set(a.refereeId, entry);
      });
    });
    return Array.from(totals.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  function exportTotales() {
    const rows = computeTotales().map((t) => [t.nombre, t.partidos, t.total]);
    downloadCsv(`designaciones_totales_${rangeSlug}.csv`, ["Árbitro", "Partidos", "Total"], rows);
  }

  function exportDetallePdf() {
    openHtmlForPrint(buildDesignacionesDetalleHtml(filtered, rangeLabel, teams));
  }

  function exportTotalesPdf() {
    openHtmlForPrint(buildDesignacionesTotalesHtml(computeTotales(), rangeLabel));
  }

  return (
    <div>
      <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <SectionIcon view="designaciones" />
            <h1 className="font-display text-2xl font-semibold">Designaciones</h1>
          </div>
          <p className="text-text-dim text-[13px] m-0">Partidos designados a árbitros y lo que cobra cada uno.</p>
        </div>
        {canManage && tab === "grilla" && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="bg-transparent text-text-dim border border-line rounded-lg text-[13.5px] px-4 py-2.5"
            >
              Importar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
            >
              + Nueva designación
            </button>
          </div>
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
            <span className="text-[13px] font-medium px-1.5 min-w-[130px] text-center capitalize">{rangeLabel}</span>
            <button onClick={() => changeMonth(1)} className="px-2 py-1 text-text-dim hover:text-text" aria-label="Mes siguiente">
              ›
            </button>
          </div>
          <RangeFilter key={`${desde}|${hasta}`} desde={desde} hasta={hasta} customRange={customRange} onApply={applyRange} onClear={clearRange} />
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => onDayChange(e.target.value)}
              title="Filtrar por un día puntual"
              className="text-[13px]"
            />
            {selectedDay && (
              <button
                onClick={() => setSelectedDay("")}
                title="Quitar filtro de día"
                className="text-text-faint hover:text-text px-1.5 py-1 text-[13px]"
              >
                ×
              </button>
            )}
          </div>
          {tab === "grilla" && (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por equipo, árbitro, sede, categoría..."
                className="flex-1 min-w-[220px]"
              />
              <button
                onClick={exportDetalle}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
              >
                Exportar CSV
              </button>
              <button
                onClick={exportTotales}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
              >
                Exportar totales por árbitro
              </button>
              <button
                onClick={exportDetallePdf}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
              >
                Exportar PDF
              </button>
              <button
                onClick={exportTotalesPdf}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[12px] px-2.5 py-2 whitespace-nowrap"
              >
                Exportar totales PDF
              </button>
            </>
          )}
        </div>
      )}

      {tab === "grilla" && canManage && (
        <DesignacionesGrid
          designaciones={filtered}
          referees={referees}
          teams={teams}
          onEdit={(d) => setEditing(d)}
          sortOrder={sortOrder}
          onToggleSort={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
          confirmaciones={confirmaciones}
          pendingIds={pendingIds}
          assignmentsByReferee={assignmentsByReferee}
          disponibilidadPorArbitro={disponibilidadPorArbitro}
        />
      )}

      {tab === "mias" &&
        (myRefereeId ? (
          <MisDesignacionesView
            designaciones={misDesignaciones}
            myRefereeId={myRefereeId}
            viaticos={viaticos}
            companeros={companeros}
            confirmaciones={confirmaciones}
            teams={teams}
          />
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

      {showImport && <ImportModal referees={referees} teams={teams} competencias={competencias} onClose={() => setShowImport(false)} />}
    </div>
  );
}

// Estado local para no pisar lo que el usuario está tipeando hasta que
// termine de elegir las dos fechas. El padre lo remonta con `key={desde|hasta}`
// cada vez que el rango efectivo cambia desde el server, así se resincroniza
// sin necesitar un efecto.
function RangeFilter({
  desde,
  hasta,
  customRange,
  onApply,
  onClear,
}: {
  desde: string;
  hasta: string;
  customRange: boolean;
  onApply: (desde: string, hasta: string) => void;
  onClear: () => void;
}) {
  const [desdeInput, setDesdeInput] = useState(desde);
  const [hastaInput, setHastaInput] = useState(hasta);

  return (
    <div className="flex items-center gap-1.5 bg-surface-2 border border-line rounded-lg px-2 py-1">
      <span className="text-[10.5px] text-text-faint uppercase tracking-wide">Rango</span>
      <input
        type="date"
        value={desdeInput}
        onChange={(e) => {
          setDesdeInput(e.target.value);
          onApply(e.target.value, hastaInput);
        }}
        title="Desde"
        className="text-[13px]"
      />
      <span className="text-text-faint text-[12px]">–</span>
      <input
        type="date"
        value={hastaInput}
        onChange={(e) => {
          setHastaInput(e.target.value);
          onApply(desdeInput, e.target.value);
        }}
        title="Hasta"
        className="text-[13px]"
      />
      {customRange && (
        <button onClick={onClear} title="Volver a la vista mensual" className="text-text-faint hover:text-text px-1 text-[13px]">
          ×
        </button>
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
