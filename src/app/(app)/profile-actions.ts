"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";

export async function updateMyPhotoUrl(url: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("profiles").update({ photo_url: url }).eq("id", profile.id);
  revalidatePath("/", "layout");
}

// Marca el feed de notificaciones de Inicio (confirmaciones + comentarios de
// árbitros) como visto, para que no vuelvan a contar como nuevo.
export async function marcarNotificacionesHomeVistas() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("profiles").update({ notificaciones_home_seen_at: new Date().toISOString() }).eq("id", profile.id);
}
