import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import YearsView from "./YearsView";

export default async function ClasesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: years }, { data: classes }] = await Promise.all([
    supabase.from("class_years").select("id, name").order("name", { ascending: false }),
    supabase.from("classes").select("year_id"),
  ]);

  const counts: Record<string, number> = {};
  (classes ?? []).forEach((c) => {
    counts[c.year_id] = (counts[c.year_id] ?? 0) + 1;
  });

  return <YearsView years={years ?? []} counts={counts} canManage={canEvaluate(profile)} />;
}
