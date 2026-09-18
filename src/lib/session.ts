import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mondayOf, addDays } from "@/lib/weekUtils";
import type { Role } from "@/lib/database.types";

export interface SessionProfile {
  id: string;
  name: string;
  role: Role;
  status: "approved" | "pending";
  photo_url: string | null;
  referee_id: string | null;
}

export async function requireProfile(): Promise<SessionProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, status, photo_url, referee_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return profile;
}

export function canEvaluate(profile: SessionProfile) {
  return profile.role === "coordinador" || profile.role === "instructor";
}
export function canDelete(profile: SessionProfile) {
  return profile.role === "coordinador";
}
export function isArbitro(profile: SessionProfile) {
  return profile.role === "arbitro";
}
export function isCoordinador(profile: SessionProfile) {
  return profile.role === "coordinador";
}

// Mismos avisos que se muestran como badge en el menú (Sidebar y pantalla de
// inicio), calculados en un solo lugar para que no se desincronicen.
export async function getNavBadges(profile: SessionProfile): Promise<{ pendingCount: number; disponibilidadPendiente: boolean }> {
  const supabase = await createClient();
  let pendingCount = 0;
  let disponibilidadPendiente = false;

  if (isCoordinador(profile)) {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending");
    pendingCount = count ?? 0;
  }
  if (profile.referee_id) {
    const monday = mondayOf(new Date().toISOString().slice(0, 10));
    const { data } = await supabase
      .from("disponibilidades")
      .select("fecha")
      .eq("referee_id", profile.referee_id)
      .in("fecha", [addDays(monday, 5), addDays(monday, 6)]);
    disponibilidadPendiente = (data?.length ?? 0) < 2;
  }

  return { pendingCount, disponibilidadPendiente };
}
