function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  // BOM para que Excel/Sheets reconozcan bien los acentos.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = toCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
