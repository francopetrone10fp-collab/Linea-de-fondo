"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/session";

export async function addLiquidacionManual(input: { refereeId: string; fecha: string; concepto: string; monto: number }) {
  const profile = await requireProfile();
  const concepto = input.concepto.trim();
  if (!input.refereeId) return { ok: false as const, error: "Elegí un árbitro" };
  if (!concepto) return { ok: false as const, error: "Poné un concepto (ej: nombre del partido o motivo del monto)" };
  if (!input.monto || input.monto <= 0) return { ok: false as const, error: "El monto tiene que ser mayor a 0" };

  const supabase = await createClient();
  const { error } = await supabase.from("liquidaciones_manuales").insert({
    referee_id: input.refereeId,
    fecha: input.fecha,
    concepto,
    monto: input.monto,
    created_by: profile.id,
  });
  if (error) return { ok: false as const, error: "No se pudo guardar" };
  revalidatePath("/liquidaciones");
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function updateLiquidacionManual(
  id: string,
  input: { refereeId: string; fecha: string; concepto: string; monto: number }
) {
  const concepto = input.concepto.trim();
  if (!input.refereeId) return { ok: false as const, error: "Elegí un árbitro" };
  if (!concepto) return { ok: false as const, error: "Poné un concepto (ej: nombre del partido o motivo del monto)" };
  if (!input.monto || input.monto <= 0) return { ok: false as const, error: "El monto tiene que ser mayor a 0" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("liquidaciones_manuales")
    .update({ referee_id: input.refereeId, fecha: input.fecha, concepto, monto: input.monto })
    .eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo actualizar" };
  revalidatePath("/liquidaciones");
  revalidatePath("/designaciones");
  return { ok: true as const };
}

export async function deleteLiquidacionManual(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("liquidaciones_manuales").delete().eq("id", id);
  if (error) return { ok: false as const, error: "No se pudo eliminar" };
  revalidatePath("/liquidaciones");
  revalidatePath("/designaciones");
  return { ok: true as const };
}
