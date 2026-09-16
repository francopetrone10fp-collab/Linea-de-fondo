// Exporta un archivo que Excel abre nativamente como planilla (columnas
// separadas, ancho por columna, encabezado en negrita, celdas coloreadas)
// sin depender de ninguna librería externa: es HTML con las extensiones
// propietarias que Excel reconoce al abrir un archivo .xls. Evita sumar
// paquetes de terceros (varias librerías de xlsx/exceljs traen
// vulnerabilidades conocidas sin parche) para un caso de uso que no
// necesita más que esto.

export type ExcelCellStyle = "good" | "bad" | "neutral" | null;

export interface ExcelCell {
  value: string;
  style?: ExcelCellStyle;
}

export interface ExcelColumn {
  header: string;
  widthPx: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Soporta saltos de línea dentro de una celda (para listar varias
// categorías, una por renglón, en vez de todas separadas por comas).
function cellHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

const STYLE_CLASS: Record<Exclude<ExcelCellStyle, null>, string> = {
  good: "good",
  bad: "bad",
  neutral: "neutral",
};

export function downloadExcel(filename: string, columns: ExcelColumn[], rows: ExcelCell[][]) {
  const cols = columns.map((c) => `<col style="width:${c.widthPx}px">`).join("");
  const thead = `<tr>${columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => {
            const cls = cell.style ? ` class="${STYLE_CLASS[cell.style]}"` : "";
            return `<td${cls}>${cellHtml(cell.value)}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  th, td { border: 1px solid #D9D9D9; padding: 4px 8px; vertical-align: top; mso-number-format:"\\@"; }
  th { background: #305496; color: #FFFFFF; font-weight: 700; text-align: left; }
  .good { background: #C6EFCE; color: #006100; }
  .bad { background: #FFC7CE; color: #9C0006; }
  .neutral { background: #FFEB9C; color: #9C6500; }
</style>
</head>
<body>
<table>
<colgroup>${cols}</colgroup>
<thead>${thead}</thead>
<tbody>${tbody}</tbody>
</table>
</body>
</html>`;

  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
