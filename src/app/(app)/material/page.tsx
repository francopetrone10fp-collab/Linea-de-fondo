import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import MaterialView from "./MaterialView";

export default async function MaterialPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: materialsRaw } = await supabase
    .from("materials")
    .select("id, title, type, url, description, created_at, created_by")
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((materialsRaw ?? []).map((m) => m.created_by))];
  const { data: creators } =
    creatorIds.length > 0
      ? await supabase.from("profiles").select("id, name").in("id", creatorIds)
      : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((creators ?? []).map((c) => [c.id, c.name]));

  const materials = (materialsRaw ?? []).map((m) => ({
    ...m,
    createdByName: nameById.get(m.created_by) ?? "—",
  }));

  return <MaterialView materials={materials} canManage={canEvaluate(profile)} />;
}
