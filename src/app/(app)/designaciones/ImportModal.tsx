"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RefereeCombobox from "@/components/RefereeCombobox";
import { bulkImportDesignaciones, type BulkImportRow } from "./actions";
import { parsePastedText, type ParsedImportRow, type RefereeOption } from "./importParse";
import { TeamBadge } from "./DesignacionesGrid";
import type { DesignacionEstado } from "@/lib/database.types";

interface TeamOption {
  id: string;
  name: string;
  color: string;
  photo_url: string | null;
}

interface WorkingRow extends ParsedImportRow {
  arbitro1Id: string;
  arbitro2Id: string;
  arbitro3Id: string;
}

const ESTADO_LABELS: Record<DesignacionEstado, string> = {
  programado: "Programado",
  confirmar: "A confirmar",
  confirmado: "Confirmado",
  suspendido: "Suspendido",
  jugado: "Jugado",
};

export default function ImportModal({
  referees,
  teams,
  competencias,
  onClose,
}: {
  referees: RefereeOption[];
  teams: TeamOption[];
  competencias: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [competencia, setCompetencia] = useState(competencias[0] ?? "LFF");
  const [rows, setRows] = useState<WorkingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; updated: number; conflictos: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onProcesar() {
    setError(null);
    setResult(null);
    const parsed = parsePastedText(text, referees);
    if (parsed.length === 0) {
      setError("No encontré ninguna fila para procesar.");
      return;
    }
    setRows(
      parsed.map((r) => ({
        ...r,
        arbitro1Id: r.arbitro1?.match?.id ?? "",
        arbitro2Id: r.arbitro2?.match?.id ?? "",
        arbitro3Id: r.arbitro3?.match?.id ?? "",
      }))
    );
  }

  const summary = useMemo(() => {
    if (!rows) return null;
    const conError = rows.filter((r) => r.error).length;
    const sinArbitros = rows.filter((r) => !r.error && !r.arbitro1Id && !r.arbitro2Id).length;
    return { total: rows.length, conError, listas: rows.length - conError, sinArbitros };
  }, [rows]);

  function updateRow(idx: number, patch: Partial<WorkingRow>) {
    setRows((prev) => (prev ? prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)) : prev));
  }

  function onConfirmar() {
    if (!rows) return;
    setError(null);
    const validas = rows.filter((r) => !r.error);
    const input: BulkImportRow[] = validas.map((r) => {
      const arbitros: BulkImportRow["arbitros"] = [];
      if (r.arbitro1Id) arbitros.push({ posicion: 1, refereeId: r.arbitro1Id });
      if (r.arbitro2Id) arbitros.push({ posicion: 2, refereeId: r.arbitro2Id });
      if (r.arbitro3Id) arbitros.push({ posicion: 3, refereeId: r.arbitro3Id });
      return {
        jornada: r.jornada,
        fecha: r.fecha,
        hora: r.hora,
        categoria: r.categoria,
        competencia,
        rama: r.rama,
        equipoLocal: r.equipoLocal,
        equipoVisitante: r.equipoVisitante,
        sede: r.sede,
        estado: r.estado,
        notas: r.notas,
        ctNombre: r.ctNombre,
        arbitros,
      };
    });
    startTransition(async () => {
      const res = await bulkImportDesignaciones(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({ inserted: res.inserted, updated: res.updated, conflictos: res.conflictos });
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-[1100px] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-[19px] mb-1">Importar designaciones</h2>
        <p className="text-[12.5px] text-text-faint mb-4">
          Copiá las filas de tu planilla (Jornada, Día, Hora, Categoría, Local, Visitante, Árbitro 1, Árbitro 2 y opcionalmente
          una columna con sede/estado/notas) y pegalas acá abajo.
        </p>

        {!rows && (
          <>
            <div className="flex flex-col gap-1 mb-3.5">
              <label className="text-[12.5px] text-text-dim font-medium">Competencia de estas filas</label>
              <input
                type="text"
                list="import-competencias"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="w-full max-w-[220px]"
              />
              <datalist id="import-competencias">
                {competencias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"FECHA 5\t10/04/2026\t21:30\tPRIMERA B\tALBA\tMACIEL\tPETRONE\tJEREZ"}
              className="w-full font-mono text-[12px]"
              style={{ height: 220 }}
            />
            {error && <p className="text-bad-text text-[12.5px] mt-2">{error}</p>}
            <div className="flex justify-end gap-2.5 mt-4">
              <button type="button" onClick={onClose} className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2">
                Cancelar
              </button>
              <button
                onClick={onProcesar}
                disabled={!text.trim()}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Procesar
              </button>
            </div>
          </>
        )}

        {rows && !result && (
          <>
            <div className="bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-[12.5px] text-text-dim mb-3.5">
              {summary?.total} filas · {summary?.listas} para importar (competencia {competencia})
              {summary && summary.conError > 0 && <> · {summary.conError} con error, no se van a importar</>}
              {summary && summary.sinArbitros > 0 && <> · {summary.sinArbitros} sin ningún árbitro asignado todavía</>}
            </div>

            <div className="overflow-x-auto border border-line rounded-xl mb-3.5">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-surface-2 text-text-dim text-[10.5px] uppercase tracking-wide">
                    <Th>#</Th>
                    <Th>Día / hora</Th>
                    <Th>Categoría</Th>
                    <Th>Local vs Visitante</Th>
                    <Th>Árbitro 1</Th>
                    <Th>Árbitro 2</Th>
                    <Th>Árbitro 3</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className={`border-b border-line last:border-b-0 ${r.error ? "bg-bad-bg/30" : ""}`}>
                      <td className="px-2 py-1.5 text-text-faint">{r.rowNumber}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {r.error ? (
                          <span className="text-bad-text">{r.error}</span>
                        ) : (
                          <>
                            {r.fecha ?? "—"}
                            {r.hora ? ` · ${r.hora}` : ""}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.categoria}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <TeamBadge name={r.equipoLocal} teams={teams} />
                          {r.equipoLocal} <span className="text-text-faint">vs</span> {r.equipoVisitante}
                          <TeamBadge name={r.equipoVisitante} teams={teams} />
                        </div>
                      </td>
                      <ArbitroCell
                        listId={`import-arb1-${idx}`}
                        raw={r.arbitro1?.raw}
                        candidates={r.arbitro1?.candidates}
                        value={r.arbitro1Id}
                        referees={referees}
                        onChange={(v) => updateRow(idx, { arbitro1Id: v })}
                      />
                      <ArbitroCell
                        listId={`import-arb2-${idx}`}
                        raw={r.arbitro2?.raw}
                        candidates={r.arbitro2?.candidates}
                        value={r.arbitro2Id}
                        referees={referees}
                        onChange={(v) => updateRow(idx, { arbitro2Id: v })}
                      />
                      <ArbitroCell
                        listId={`import-arb3-${idx}`}
                        raw={r.arbitro3?.raw}
                        candidates={r.arbitro3?.candidates}
                        value={r.arbitro3Id}
                        referees={referees}
                        onChange={(v) => updateRow(idx, { arbitro3Id: v })}
                      />
                      <td className="px-2 py-1.5 whitespace-nowrap">{ESTADO_LABELS[r.estado]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}

            <div className="flex justify-end gap-2.5">
              <button type="button" onClick={() => setRows(null)} className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2">
                Volver a pegar
              </button>
              <button
                disabled={isPending || !summary?.listas}
                onClick={onConfirmar}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                {isPending ? "Importando…" : `Confirmar importación (${summary?.listas ?? 0})`}
              </button>
            </div>
          </>
        )}

        {result && (
          <div>
            <p className="text-[14px] mb-4">
              Listo: <b>{result.inserted}</b> designaciones nuevas y <b>{result.updated}</b> actualizadas.
              {result.conflictos > 0 && (
                <>
                  {" "}
                  <span className="text-amber-text">
                    {result.conflictos} árbitro{result.conflictos === 1 ? "" : "s"} no se {result.conflictos === 1 ? "asignó" : "asignaron"} por
                    estar ya designado{result.conflictos === 1 ? "" : "s"} a esa misma hora en otro partido.
                  </span>
                </>
              )}
            </p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left font-semibold px-2 py-1.5 border-b border-line whitespace-nowrap">{children}</th>;
}

function ArbitroCell({
  listId,
  raw,
  candidates,
  value,
  referees,
  onChange,
}: {
  listId: string;
  raw: string | undefined;
  candidates: RefereeOption[] | undefined;
  value: string;
  referees: RefereeOption[];
  onChange: (v: string) => void;
}) {
  const ambiguous = !!raw && !value && (candidates?.length ?? 0) > 0;
  const unresolved = !!raw && !value && (candidates?.length ?? 0) === 0;
  return (
    <td className="px-2 py-1.5 whitespace-nowrap">
      <RefereeCombobox
        key={value}
        listId={listId}
        referees={referees}
        value={value}
        onChange={onChange}
        className={`min-w-[130px] ${ambiguous || unresolved ? "border-amber" : ""}`}
      />
      {(ambiguous || unresolved) && (
        <div className="text-[10px] text-amber-text mt-0.5">
          “{raw}” {ambiguous ? "es ambiguo" : "no se encontró"}
        </div>
      )}
    </td>
  );
}
