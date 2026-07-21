"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { colorForTeam, slugKey } from "@/lib/constants";
import type { Role } from "@/lib/database.types";

export async function approveRequest(profileId: string, role: Role) {
  const me = await requireProfile();
  if (!isCoordinador(me)) return { ok: false as const, error: "No autorizado" };

  const admin = createServiceRoleClient();
  const { data: target } = await admin.from("profiles").select("id, name").eq("id", profileId).single();
  if (!target) return { ok: false as const, error: "Ese perfil ya no existe" };

  const { error } = await admin.from("profiles").update({ role, status: "approved" }).eq("id", profileId);
  if (error) return { ok: false as const, error: "No se pudo aprobar" };

  if (role === "arbitro") {
    const slug = slugKey(target.name);
    const { data: existingReferees } = await admin.from("referees").select("id, name");
    const existing = (existingReferees ?? []).find((r: { id: string; name: string }) => slugKey(r.name) === slug);
    let refereeId = existing?.id as string | undefined;
    if (!refereeId) {
      const { data: created } = await admin
        .from("referees")
        .insert({ name: target.name, color: colorForTeam(target.name), created_by: profileId })
        .select("id")
        .single();
      refereeId = created?.id;
    }
    if (refereeId) await admin.from("profiles").update({ referee_id: refereeId }).eq("id", profileId);
  }

  revalidatePath("/requests");
  revalidatePath("/referees");
  return { ok: true as const };
}

export async function rejectRequest(profileId: string) {
  const me = await requireProfile();
  if (!isCoordinador(me)) return { ok: false as const, error: "No autorizado" };

  const admin = createServiceRoleClient();
  await admin.auth.admin.deleteUser(profileId);
  const supabase = await createClient();
  await supabase.from("profiles").delete().eq("id", profileId);

  revalidatePath("/requests");
  return { ok: true as const };
}
