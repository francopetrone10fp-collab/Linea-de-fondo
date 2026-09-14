import { NextResponse } from "next/server";
import webpush, { WebPushError } from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { mondayOf, addDays } from "@/lib/weekUtils";

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

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@lineadefondo.app", vapidPublic, vapidPrivate);

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

  if (profileIdsPendientes.length === 0) {
    return NextResponse.json({ enviados: 0, pendientes: 0 });
  }

  const { data: subs } = await supabase.from("push_subscriptions").select("*").in("profile_id", profileIdsPendientes);

  let enviados = 0;
  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Cargá tu disponibilidad",
            body: "Todavía no marcaste tu disponibilidad para este sábado y domingo.",
            url: "/disponibilidad",
          })
        );
        enviados++;
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ enviados, pendientes: profileIdsPendientes.length });
}
