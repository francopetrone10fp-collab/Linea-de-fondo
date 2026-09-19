import webpush, { WebPushError } from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";

let vapidReady = false;

function ensureVapid(): boolean {
  if (vapidReady) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@lineadefondo.app", publicKey, privateKey);
  vapidReady = true;
  return true;
}

// Manda una notificación push a las suscripciones de estos perfiles (uno
// puede tener varias, ej. celular + PC). Si algún endpoint ya no existe del
// lado del navegador (404/410), lo borramos de una para no reintentar
// siempre en vano. Se usa tanto desde el cron semanal como desde acciones
// puntuales (ej. al designar a un árbitro).
export async function sendPushToProfiles(profileIds: string[], payload: { title: string; body: string; url?: string; image?: string }) {
  if (profileIds.length === 0 || !ensureVapid()) return { enviados: 0 };

  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase.from("push_subscriptions").select("*").in("profile_id", profileIds);
  if (!subs || subs.length === 0) return { enviados: 0 };

  let enviados = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
        enviados++;
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );
  return { enviados };
}
