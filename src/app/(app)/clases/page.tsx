import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import ClasesView from "./ClasesView";

export default async function ClasesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: classesRaw } = await supabase
    .from("classes")
    .select("id, title, video_url, notes, created_at, created_by")
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((classesRaw ?? []).map((c) => c.created_by))];
  const { data: creators } =
    creatorIds.length > 0
      ? await supabase.from("profiles").select("id, name").in("id", creatorIds)
      : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((creators ?? []).map((c) => [c.id, c.name]));

  const classes = (classesRaw ?? []).map((c) => ({
    ...c,
    createdByName: nameById.get(c.created_by) ?? "—",
  }));

  return <ClasesView classes={classes} canManage={canEvaluate(profile)} />;
}
