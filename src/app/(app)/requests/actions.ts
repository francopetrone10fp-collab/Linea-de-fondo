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

// Vincula (o desvincula) el perfil de un Coordinador/Instructor con una
// ficha de árbitro ya existente. Hace falta para cuando alguien con esos
// roles también arbitra partidos: sin este vínculo no puede ver "sus"
// partidos evaluados ni confirmar la lectura del informe, aunque las
// evaluaciones ya estén cargadas contra esa ficha de árbitro.
export async function linkProfileReferee(profileId: string, refereeId: string | null) {
  const me = await requireProfile();
  if (!isCoordinador(me)) return { ok: false as const, error: "No autorizado" };

  const admin = createServiceRoleClient();
  const { error } = await admin.from("profiles").update({ referee_id: refereeId }).eq("id", profileId);
  if (error) return { ok: false as const, error: "No se pudo vincular el árbitro" };

  revalidatePath("/requests");
  return { ok: true as const };
}

// Resetea manualmente la clave de un perfil (para árbitros u otros
// usuarios que la olvidaron y no pueden entrar solos).
export async function resetProfilePassword(profileId: string, newPassword: string) {
  const me = await requireProfile();
  if (!isCoordinador(me)) return { ok: false as const, error: "No autorizado" };
  if (newPassword.length < 4) return { ok: false as const, error: "La clave debe tener al menos 4 caracteres." };

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password: newPassword });
  if (error) return { ok: false as const, error: "No se pudo cambiar la clave" };

  return { ok: true as const };
}
