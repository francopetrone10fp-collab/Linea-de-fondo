import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canEvaluate } from "@/lib/session";
import { fetchAllClipsFull } from "./queries";
import ReportsView from "./ReportsView";

export default async function ReportesPage() {
  const profile = await requireProfile();
  if (!canEvaluate(profile)) redirect("/competitions");

  const supabase = await createClient();
  const [clips, { data: teams }, { data: referees }] = await Promise.all([
    fetchAllClipsFull(supabase),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("referees").select("id, name").order("name"),
  ]);

  const seasons = Array.from(new Set(clips.map((c) => c.partidoTemporada))).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true })
  );

  return <ReportsView clips={clips} teams={teams ?? []} referees={referees ?? []} seasons={seasons} />;
}
