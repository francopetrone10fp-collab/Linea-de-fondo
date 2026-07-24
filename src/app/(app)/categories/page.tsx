import { createClient } from "@/lib/supabase/server";
import { requireProfile, canDelete } from "@/lib/session";
import CategoriesView from "./CategoriesView";

export default async function CategoriesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: categories }, { data: partidos }] = await Promise.all([
    supabase.from("categories").select("id, name, color").order("name"),
    supabase.from("partidos").select("category_id"),
  ]);

  const counts: Record<string, number> = {};
  (partidos ?? []).forEach((p) => {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
  });

  return (
    <CategoriesView
      categories={categories ?? []}
      counts={counts}
      canDeleteCategories={canDelete(profile)}
    />
  );
}
