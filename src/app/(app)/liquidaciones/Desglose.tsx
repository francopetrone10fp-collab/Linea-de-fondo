import type { ItemLiquidacion, TotalArbitro } from "@/lib/constants";
import { money } from "../designaciones/DesignacionesGrid";

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function montoClass(monto: number): string {
  return monto < 0 ? "text-bad-text" : "";
}

// Desglose del total de un árbitro para el período elegido en Liquidaciones:
// tres secciones (partidos dirigidos, comisionado técnico, montos
// manuales), cada una solo si tiene ítems, con subtotal propio. El total de
// abajo de todo es arbitro.total — el mismo campo que ya usa la lista
// principal, nunca se recalcula acá, así nunca pueden quedar desincronizados.
export default function Desglose({ arbitro }: { arbitro: TotalArbitro }) {
  const partidos = arbitro.items.filter((i): i is Extract<ItemLiquidacion, { tipo: "partido" }> => i.tipo === "partido");
  const ct = arbitro.items.filter((i): i is Extract<ItemLiquidacion, { tipo: "ct" }> => i.tipo === "ct");
  const manuales = arbitro.items.filter((i): i is Extract<ItemLiquidacion, { tipo: "manual" }> => i.tipo === "manual");

  const subtotal = (items: ItemLiquidacion[]) => items.reduce((sum, i) => sum + i.monto, 0);

  if (arbitro.items.length === 0) {
    return <p className="text-[12.5px] text-text-faint m-0 px-3.5 py-3">No hay ítems para este período.</p>;
  }

  return (
    <div className="px-3.5 py-3 flex flex-col gap-4 bg-surface-2">
      {partidos.length > 0 && (
        <Seccion titulo="Partidos dirigidos" subtotal={subtotal(partidos)}>
          <table className="hidden md:table w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-text-faint">
                <th className="font-semibold py-1 pr-3">Fecha</th>
                <th className="font-semibold py-1 pr-3">Partido</th>
                <th className="font-semibold py-1 pr-3">Competencia / Categoría</th>
                <th className="font-semibold py-1 pr-3">Rol</th>
                <th className="font-semibold py-1 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {partidos.map((p) => (
                <tr key={p.id} className="border-t border-line/60">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{formatFecha(p.fecha)}</td>
                  <td className="py-1.5 pr-3">
                    {p.equipoLocal} <span className="text-text-faint">vs</span> {p.equipoVisitante}
                  </td>
                  <td className="py-1.5 pr-3 text-text-dim">{[p.competencia, p.categoria].filter(Boolean).join(" · ")}</td>
                  <td className="py-1.5 pr-3 text-text-dim">{p.rol}</td>
                  <td className={`py-1.5 text-right font-mono ${montoClass(p.monto)}`}>{money.format(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden flex flex-col gap-2">
            {partidos.map((p) => (
              <div key={p.id} className="bg-surface border border-line rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-text-faint">{formatFecha(p.fecha)}</span>
                  <span className={`font-mono text-[13px] font-semibold ${montoClass(p.monto)}`}>{money.format(p.monto)}</span>
                </div>
                <p className="text-[13px] font-medium m-0 mt-1">
                  {p.equipoLocal} <span className="text-text-faint">vs</span> {p.equipoVisitante}
                </p>
                <p className="text-[12px] text-text-dim m-0 mt-0.5">
                  {[p.competencia, p.categoria].filter(Boolean).join(" · ")} · {p.rol}
                </p>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {ct.length > 0 && (
        <Seccion titulo="Comisionado técnico" subtotal={subtotal(ct)}>
          <table className="hidden md:table w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-text-faint">
                <th className="font-semibold py-1 pr-3">Fecha</th>
                <th className="font-semibold py-1 pr-3">Partido</th>
                <th className="font-semibold py-1 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {ct.map((c) => (
                <tr key={c.id} className="border-t border-line/60">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                  <td className="py-1.5 pr-3">
                    {c.equipoLocal} <span className="text-text-faint">vs</span> {c.equipoVisitante}
                  </td>
                  <td className={`py-1.5 text-right font-mono ${montoClass(c.monto)}`}>{money.format(c.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden flex flex-col gap-2">
            {ct.map((c) => (
              <div key={c.id} className="bg-surface border border-line rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-text-faint">{formatFecha(c.fecha)}</span>
                  <span className={`font-mono text-[13px] font-semibold ${montoClass(c.monto)}`}>{money.format(c.monto)}</span>
                </div>
                <p className="text-[13px] font-medium m-0 mt-1">
                  {c.equipoLocal} <span className="text-text-faint">vs</span> {c.equipoVisitante}
                </p>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {manuales.length > 0 && (
        <Seccion titulo="Montos manuales" subtotal={subtotal(manuales)}>
          <table className="hidden md:table w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-text-faint">
                <th className="font-semibold py-1 pr-3">Fecha</th>
                <th className="font-semibold py-1 pr-3">Concepto</th>
                <th className="font-semibold py-1 pr-3">Nota</th>
                <th className="font-semibold py-1 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {manuales.map((m) => (
                <tr key={m.id} className="border-t border-line/60">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{formatFecha(m.fecha)}</td>
                  <td className="py-1.5 pr-3">{m.concepto}</td>
                  <td className="py-1.5 pr-3 text-text-dim">{m.nota || "—"}</td>
                  <td className={`py-1.5 text-right font-mono ${montoClass(m.monto)}`}>{money.format(m.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden flex flex-col gap-2">
            {manuales.map((m) => (
              <div key={m.id} className="bg-surface border border-line rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-text-faint">{formatFecha(m.fecha)}</span>
                  <span className={`font-mono text-[13px] font-semibold ${montoClass(m.monto)}`}>{money.format(m.monto)}</span>
                </div>
                <p className="text-[13px] font-medium m-0 mt-1">{m.concepto}</p>
                {m.nota && <p className="text-[12px] text-text-dim m-0 mt-0.5">{m.nota}</p>}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-line">
        <span className="text-[13px] font-semibold uppercase tracking-wide">Total liquidado</span>
        <span className="font-mono text-[15px] font-bold">{money.format(arbitro.total)}</span>
      </div>
    </div>
  );
}

function Seccion({ titulo, subtotal, children }: { titulo: string; subtotal: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-faint m-0 mb-1.5">{titulo}</h3>
      {children}
      <div className="flex items-center justify-end gap-2 pt-1.5 mt-1 border-t border-line/60">
        <span className="text-[11.5px] text-text-dim">Subtotal</span>
        <span className={`font-mono text-[12.5px] font-semibold ${montoClass(subtotal)}`}>{money.format(subtotal)}</span>
      </div>
    </div>
  );
}
