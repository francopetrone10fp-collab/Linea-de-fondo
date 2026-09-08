import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import ClassDetailView from "./ClassDetailView";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ yearId: string; classId: string }>;
}) {
  const { yearId, classId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: year }, { data: clase }, { data: clips }, { data: links }, { data: allMaterials }] = await Promise.all([
    supabase.from("class_years").select("id, name").eq("id", yearId).single(),
    supabase
      .from("classes")
      .select("id, year_id, title, video_url, notes, levels, created_at")
      .eq("id", classId)
      .single(),
    supabase
      .from("class_clips")
      .select("id, title, video_url, notes, created_at")
      .eq("class_id", classId)
      .order("created_at", { ascending: true }),
    supabase.from("class_materials").select("material_id").eq("class_id", classId),
    supabase.from("materials").select("id, title, type, url").order("title"),
  ]);

  if (!year || !clase || clase.year_id !== yearId) notFound();

  const linkedIds = new Set((links ?? []).map((l) => l.material_id));
  const linkedMaterials = (allMaterials ?? []).filter((m) => linkedIds.has(m.id));
  const availableMaterials = (allMaterials ?? []).filter((m) => !linkedIds.has(m.id));

  return (
    <div>
      <Link
        href={`/clases/${yearId}`}
        className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a {year.name}
      </Link>

      <ClassDetailView
        clase={clase}
        clips={clips ?? []}
        linkedMaterials={linkedMaterials}
        availableMaterials={availableMaterials}
        canManage={canEvaluate(profile)}
      />
    </div>
  );
}
