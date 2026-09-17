// Helpers de fechas para la semana de disponibilidad (lunes a domingo).
// Nada de esto depende de React, así que lo comparten server components y
// vistas cliente, y también el layout (para el aviso de "falta cargar").

export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0 = domingo ... 6 = sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Las 7 fechas de la semana, en orden lunes → domingo.
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T12:00:00").getDay();
  return day === 0 || day === 6;
}

export function isSunday(dateStr: string): boolean {
  return new Date(dateStr + "T12:00:00").getDay() === 0;
}

export function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export function formatWeekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  const from = new Date(monday + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  const to = new Date(sunday + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${from} al ${to}`;
}
