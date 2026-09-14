"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";

export async function subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: profile.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false as const, error: "No se pudo activar la notificación" };
  return { ok: true as const };
}

export async function unsubscribePush(endpoint: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("profile_id", profile.id).eq("endpoint", endpoint);
  if (error) return { ok: false as const, error: "No se pudo desactivar" };
  return { ok: true as const };
}
