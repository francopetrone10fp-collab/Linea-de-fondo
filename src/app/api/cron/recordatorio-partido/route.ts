import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/weekUtils";
import { sendPushToProfiles } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Corre todos los días (ver vercel.json): les avisa a los árbitros que tienen
// un partido designado para mañana. Como el horario de cada partido varía,
// "24hs antes" se aproxima con un aviso diario a una hora fija que cubre
// todos los partidos del día siguiente, en vez de un timer por partido.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const manana = addDays(new Date().toISOString().slice(0, 10), 1);

  const { data: designaciones } = await supabase
    .from("designaciones")
    .select("id, hora, categoria, equipo_local, equipo_visitante, estado")
    .eq("fecha", manana)
    .neq("estado", "suspendido");

  const designacionIds = (designaciones ?? []).map((d) => d.id);
  if (designacionIds.length === 0) {
    return NextResponse.json({ enviados: 0, arbitros: 0 });
  }

  const { data: arbitros } = await supabase
    .from("designacion_arbitros")
    .select("designacion_id, referee_id")
    .in("designacion_id", designacionIds)
    .eq("publicado", true);

  const designacionPorId = new Map((designaciones ?? []).map((d) => [d.id, d]));
  const designacionesPorReferee = new Map<string, { hora: string | null; categoria: string; equipo_local: string; equipo_visitante: string }[]>();
  (arbitros ?? []).forEach((a) => {
    const d = designacionPorId.get(a.designacion_id);
    if (!d) return;
    if (!designacionesPorReferee.has(a.referee_id)) designacionesPorReferee.set(a.referee_id, []);
    designacionesPorReferee.get(a.referee_id)!.push(d);
  });

  if (designacionesPorReferee.size === 0) {
    return NextResponse.json({ enviados: 0, arbitros: 0 });
  }

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, referee_id")
    .in("referee_id", Array.from(designacionesPorReferee.keys()));

  let enviados = 0;
  await Promise.all(
    (perfiles ?? []).map(async (p) => {
      const partidos = designacionesPorReferee.get(p.referee_id!) ?? [];
      if (partidos.length === 0) return;

      const body =
        partidos.length === 1
          ? `${partidos[0].equipo_local} vs ${partidos[0].equipo_visitante}${partidos[0].hora ? ` · ${partidos[0].hora.slice(0, 5)}` : ""} · ${partidos[0].categoria}`
          : `Tenés ${partidos.length} partidos designados mañana. Revisalos en la app.`;

      const { enviados: n } = await sendPushToProfiles([p.id], {
        title: "Tenés un partido mañana",
        body,
        url: "/designaciones",
      });
      enviados += n;
    })
  );

  return NextResponse.json({ enviados, arbitros: designacionesPorReferee.size });
}
