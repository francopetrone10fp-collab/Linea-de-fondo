import type { DesignacionFull } from "./queries";

// Reportes de designaciones para imprimir/guardar como PDF: son documentos
// HTML standalone (mismo enfoque que src/app/(app)/partidos/reportData.ts)
// con la estética de Línea de Fondo — fondo azul noche, acento dorado y las
// líneas de cancha como marca de agua, igual que el fondo del dashboard
// (ver CourtBackdrop.tsx) — para que se sienta parte de la app y no una
// planilla genérica.

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ESTADO_LABELS: Record<string, string> = {
  programado: "Programado",
  confirmar: "A confirmar",
  suspendido: "Suspendido",
  jugado: "Jugado",
  confirmado: "Confirmado",
};

// Las mismas líneas de cancha (línea de fondo, círculo central, zona y arco)
// que CourtBackdrop.tsx usa como fondo decorativo del dashboard.
const COURT_WATERMARK = `
  <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" style="position:fixed;inset:0;width:100%;height:100%;opacity:0.055;z-index:0;">
    <g fill="none" stroke="#C79A3D" stroke-width="2.5">
      <line x1="0" y1="0" x2="400" y2="0" />
      <circle cx="200" cy="0" r="70" />
      <line x1="0" y1="520" x2="400" y2="520" />
      <rect x="140" y="380" width="120" height="140" />
      <circle cx="200" cy="380" r="60" />
      <path d="M 10 520 A 260 260 0 0 1 390 520" />
    </g>
  </svg>`;

// El mismo isotipo (pelota + línea de pase) que el logo del menú lateral.
const LOGO_SVG = `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C79A3D" stroke-width="2">
    <circle cx="9" cy="15" r="6" />
    <path d="M14 11 L21 4 M21 4 L21 8 M21 4 L17 4" />
    <circle cx="9" cy="15" r="1.6" fill="#C79A3D" stroke="none" />
  </svg>`;

function baseCss(orientation: "portrait" | "landscape") {
  return `
    @page { size: A4 ${orientation}; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { background:#0B0F14; color:#EDEFF2; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Barlow,sans-serif; margin:0; padding:28px; }
    .page { position:relative; z-index:1; }
    .brand { display:flex; align-items:center; gap:8px; margin-bottom:18px; }
    .brand-name { font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:13px; letter-spacing:0.09em; text-transform:uppercase; color:#C79A3D; }
    .title { font-size:21px; font-weight:700; margin:0 0 3px; }
    .subtitle { font-size:12.5px; color:#97A1AE; margin:0 0 22px; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { text-align:left; color:#5C6672; font-weight:600; font-size:9.5px; text-transform:uppercase; letter-spacing:0.03em; padding:0 7px 8px; border-bottom:1px solid #2C3644; white-space:nowrap; }
    td { padding:7px; border-bottom:1px solid #1C2430; vertical-align:top; }
    tr:nth-child(even) td { background:rgba(255,255,255,0.02); }
    .pill { font-size:9.5px; font-weight:700; padding:2px 8px; border-radius:20px; white-space:nowrap; display:inline-block; }
    .pill.programado, .pill.confirmar { background:#232B37; color:#97A1AE; }
    .pill.suspendido { background:#331B1B; color:#F09595; }
    .pill.jugado, .pill.confirmado { background:#1B2E1F; color:#7FCB8C; }
    .foot { margin-top:18px; padding-top:12px; border-top:1px dashed #2C3644; font-size:11px; color:#97A1AE; display:flex; gap:26px; flex-wrap:wrap; }
    .foot b { color:#EDEFF2; font-family:monospace; font-size:13px; }
    @media print { .no-print { display:none !important; } }
  `;
}

function shell(opts: { orientation: "portrait" | "landscape"; title: string; subtitle: string; body: string; foot?: string }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(opts.title)} — Línea de Fondo</title>
  <style>${baseCss(opts.orientation)}</style></head><body>
  ${COURT_WATERMARK}
  <div class="page">
    <div class="brand">${LOGO_SVG}<span class="brand-name">Línea de Fondo</span></div>
    <p class="title">${esc(opts.title)}</p>
    <p class="subtitle">${esc(opts.subtitle)}</p>
    ${opts.body}
    ${opts.foot ? `<div class="foot">${opts.foot}</div>` : ""}
  </div>
  </body></html>`;
}

export function buildDesignacionesDetalleHtml(rows: DesignacionFull[], monthLabel: string): string {
  const fechaFmt = (fecha: string | null) =>
    fecha ? new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—";

  const arbitroCell = (d: DesignacionFull, pos: number) => {
    const a = d.arbitros.find((x) => x.posicion === pos);
    if (!a) return "—";
    return `${esc(a.refereeName)}<br><span style="color:#5C6672;font-size:10px;">${money.format(a.monto)}</span>`;
  };

  const trs = rows
    .map(
      (d) => `
      <tr>
        <td style="white-space:nowrap;">${fechaFmt(d.fecha)}${d.hora ? ` · ${esc(d.hora.slice(0, 5))}` : ""}</td>
        <td>${esc(d.categoria)}</td>
        <td style="color:#97A1AE;">${[d.competencia, d.rama === "masculino" ? "Masc." : d.rama === "femenino" ? "Fem." : null].filter(Boolean).map(esc).join(" · ") || "—"}</td>
        <td><b>${esc(d.equipoLocal)}</b> <span style="color:#5C6672;">vs</span> <b>${esc(d.equipoVisitante)}</b></td>
        <td style="color:#97A1AE;">${esc(d.sede) || "—"}</td>
        <td><span class="pill ${d.estado}">${esc(ESTADO_LABELS[d.estado] ?? d.estado)}</span></td>
        <td>${arbitroCell(d, 1)}</td>
        <td>${arbitroCell(d, 2)}</td>
        <td>${arbitroCell(d, 3)}</td>
        <td>${d.ctNombre ? `${esc(d.ctNombre)}${d.ctMonto != null ? `<br><span style="color:#5C6672;font-size:10px;">${money.format(d.ctMonto)}</span>` : ""}` : "—"}</td>
        <td style="color:#97A1AE;max-width:160px;">${esc(d.notas) || "—"}</td>
      </tr>`
    )
    .join("");

  const totalPartidos = rows.length;
  const totalMonto = rows.reduce((sum, d) => sum + d.arbitros.reduce((s, a) => s + a.monto, 0) + (d.ctMonto ?? 0), 0);

  const body =
    rows.length === 0
      ? `<p style="font-size:13px;color:#5C6672;">No hay designaciones para este período con el filtro aplicado.</p>`
      : `<table><thead><tr>
          <th>Día / hora</th><th>Categoría</th><th>Competencia</th><th>Local vs Visitante</th><th>Sede</th><th>Estado</th>
          <th>Árbitro 1</th><th>Árbitro 2</th><th>Árbitro 3</th><th>Comisionado técnico</th><th>Notas</th>
        </tr></thead><tbody>${trs}</tbody></table>`;

  const generatedAt = new Date().toLocaleString("es-AR");
  const foot = `<span>Generado el ${esc(generatedAt)}</span><span><b>${totalPartidos}</b> partido${totalPartidos === 1 ? "" : "s"}</span><span><b>${esc(money.format(totalMonto))}</b> total a liquidar</span>`;

  return shell({
    orientation: "landscape",
    title: "Designaciones",
    subtitle: monthLabel,
    body,
    foot,
  });
}

export function buildDesignacionesTotalesHtml(rows: { nombre: string; partidos: number; total: number }[], monthLabel: string): string {
  const trs = rows
    .map(
      (t) => `
      <tr>
        <td>${esc(t.nombre)}</td>
        <td style="text-align:right;font-family:monospace;">${t.partidos}</td>
        <td style="text-align:right;font-family:monospace;">${esc(money.format(t.total))}</td>
      </tr>`
    )
    .join("");

  const totalPartidos = rows.reduce((sum, t) => sum + t.partidos, 0);
  const totalMonto = rows.reduce((sum, t) => sum + t.total, 0);

  const body =
    rows.length === 0
      ? `<p style="font-size:13px;color:#5C6672;">No hay datos para este período.</p>`
      : `<table><thead><tr><th>Árbitro</th><th style="text-align:right;">Partidos</th><th style="text-align:right;">Total</th></tr></thead>
        <tbody>${trs}</tbody>
        <tfoot><tr style="border-top:2px solid #2C3644;"><td style="font-weight:700;padding-top:10px;">Total general</td>
          <td style="text-align:right;font-family:monospace;font-weight:700;padding-top:10px;">${totalPartidos}</td>
          <td style="text-align:right;font-family:monospace;font-weight:700;padding-top:10px;">${esc(money.format(totalMonto))}</td></tr></tfoot></table>`;

  const generatedAt = new Date().toLocaleString("es-AR");
  return shell({
    orientation: "portrait",
    title: "Totales por árbitro",
    subtitle: monthLabel,
    body,
    foot: `<span>Generado el ${esc(generatedAt)}</span>`,
  });
}

// Abre el HTML en una pestaña nueva y dispara el diálogo de impresión, donde
// "Guardar como PDF" es una opción de destino nativa del navegador — no hace
// falta ninguna librería de generación de PDF.
export function openHtmlForPrint(html: string) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana. Habilitá los pop-ups para exportar el PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => win.print(), 250);
  };
}
