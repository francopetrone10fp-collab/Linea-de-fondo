import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
