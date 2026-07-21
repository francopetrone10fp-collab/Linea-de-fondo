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
