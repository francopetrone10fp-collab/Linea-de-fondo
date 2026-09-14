import { money } from "./DesignacionesGrid";
import type { Companero, DesignacionFull, ViaticoLocalidad } from "./queries";

export default function MisDesignacionesView({
  designaciones,
  myRefereeId,
  viaticos,
  companeros,
}: {
  designaciones: DesignacionFull[];
  myRefereeId: string;
  viaticos: ViaticoLocalidad[];
  companeros: Record<string, Companero[]>;
}) {
  const viaticoByLocalidad = new Map(viaticos.map((v) => [v.localidad, v.monto]));
  const mias = designaciones
    .map((d) => ({ d, mia: d.arbitros.find((a) => a.refereeId === myRefereeId) }))
    .filter((x): x is { d: DesignacionFull; mia: NonNullable<(typeof x)["mia"]> } => !!x.mia);

  const total = mias.reduce((sum, x) => sum + x.mia.monto, 0);

  return (
    <div>
      <div className="bg-surface-2 border border-line rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-[13px] text-text-dim">Total del mes ({mias.length} partido{mias.length === 1 ? "" : "s"})</span>
        <span className="font-display text-[19px] font-semibold">{money.format(total)}</span>
      </div>

      {mias.length === 0 ? (
        <p className="text-[12.5px] text-text-faint m-0">Todavía no tenés designaciones cargadas para este mes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mias.map(({ d, mia }) => (
            <div key={d.id} className="bg-surface border border-line rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[14px] font-semibold m-0">
                  {d.equipoLocal} <span className="text-text-faint font-normal">vs</span> {d.equipoVisitante}
                </p>
                <p className="text-[12px] text-text-dim m-0 mt-0.5">
                  {d.fecha
                    ? new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "Sin fecha"}
                  {d.hora ? ` · ${d.hora.slice(0, 5)}` : ""} · {d.categoria}
                  {d.sede ? ` · ${d.sede}` : ""}
                </p>
                {d.localidad && viaticoByLocalidad.has(d.localidad) && (
                  <p className="text-[11px] text-text-faint m-0 mt-0.5">
                    Viático en cancha ({d.localidad}): {money.format(viaticoByLocalidad.get(d.localidad)!)} — se cobra
                    aparte, en efectivo, no está incluido en el monto de al lado.
                  </p>
                )}
                {(() => {
                  const compas = (companeros[d.id] ?? []).filter((c) => c.refereeId !== myRefereeId);
                  return compas.length > 0 ? (
                    <p className="text-[12px] text-text-dim m-0 mt-1">
                      Con {compas.map((c) => c.refereeName).join(" y ")}
                    </p>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-2.5">
                <EstadoBadge estado={d.estado} />
                <span className="font-display text-[15px] font-semibold">{money.format(mia.monto)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: DesignacionFull["estado"] }) {
  const style =
    estado === "suspendido"
      ? "bg-bad-bg text-bad-text"
      : estado === "confirmar"
        ? "bg-amber-bg text-amber-text"
        : estado === "jugado"
          ? "bg-good-bg text-good-text"
          : "bg-surface-3 text-text-dim";
  const label = { programado: "Programado", confirmar: "A confirmar", suspendido: "Suspendido", jugado: "Jugado" }[estado];
  return <span className={`text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${style}`}>{label}</span>;
}
