import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { mondayOf, addDays } from "@/lib/weekUtils";
import { sendPushToProfiles } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Corre todos los lunes (ver vercel.json): les manda una notificación push a
// los árbitros que todavía no cargaron su disponibilidad de sábado y domingo
// de esta semana, y que tienen las notificaciones activadas.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const monday = mondayOf(new Date().toISOString().slice(0, 10));
  const sabado = addDays(monday, 5);
  const domingo = addDays(monday, 6);

  const [{ data: profiles }, { data: cargados }] = await Promise.all([
    supabase.from("profiles").select("id, referee_id").not("referee_id", "is", null),
    supabase.from("disponibilidades").select("referee_id, fecha").in("fecha", [sabado, domingo]),
  ]);

  const fechasPorReferee = new Map<string, Set<string>>();
  (cargados ?? []).forEach((c) => {
    if (!fechasPorReferee.has(c.referee_id)) fechasPorReferee.set(c.referee_id, new Set());
    fechasPorReferee.get(c.referee_id)!.add(c.fecha);
  });

  const profileIdsPendientes = (profiles ?? [])
    .filter((p) => {
      const fechas = fechasPorReferee.get(p.referee_id!) ?? new Set();
      return !fechas.has(sabado) || !fechas.has(domingo);
    })
    .map((p) => p.id);

  const { enviados } = await sendPushToProfiles(profileIdsPendientes, {
    title: "Cargá tu disponibilidad",
    body: "Todavía no marcaste tu disponibilidad para este sábado y domingo.",
    url: "/disponibilidad",
  });

  return NextResponse.json({ enviados, pendientes: profileIdsPendientes.length });
}
