import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import ClassesListView from "./ClassesListView";

export default async function ClassYearPage({ params }: { params: Promise<{ yearId: string }> }) {
  const { yearId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: year }, { data: classesRaw }] = await Promise.all([
    supabase.from("class_years").select("id, name").eq("id", yearId).single(),
    supabase
      .from("classes")
      .select("id, title, video_url, notes, levels, created_at")
      .eq("year_id", yearId)
      .order("created_at", { ascending: false }),
  ]);
  if (!year) notFound();

  const classIds = (classesRaw ?? []).map((c) => c.id);
  const [{ data: clipRows }, { data: materialRows }] = await Promise.all([
    classIds.length > 0
      ? supabase.from("class_clips").select("class_id").in("class_id", classIds)
      : Promise.resolve({ data: [] as { class_id: string }[] }),
    classIds.length > 0
      ? supabase.from("class_materials").select("class_id").in("class_id", classIds)
      : Promise.resolve({ data: [] as { class_id: string }[] }),
  ]);

  const clipCounts: Record<string, number> = {};
  (clipRows ?? []).forEach((r) => {
    clipCounts[r.class_id] = (clipCounts[r.class_id] ?? 0) + 1;
  });
  const materialCounts: Record<string, number> = {};
  (materialRows ?? []).forEach((r) => {
    materialCounts[r.class_id] = (materialCounts[r.class_id] ?? 0) + 1;
  });

  const classes = (classesRaw ?? []).map((c) => ({
    ...c,
    clipCount: clipCounts[c.id] ?? 0,
    materialCount: materialCounts[c.id] ?? 0,
  }));

  return (
    <div>
      <Link href="/clases" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a años
      </Link>

      <ClassesListView yearId={year.id} yearName={year.name} classes={classes} canManage={canEvaluate(profile)} />
    </div>
  );
}
