import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { Empty } from "@/app/(app)/teams/TeamsView";
import RequestsView from "./RequestsView";

export default async function RequestsPage() {
  const profile = await requireProfile();
  if (!isCoordinador(profile)) {
    return (
      <Empty
        title="Solo el Coordinador General puede ver esto"
        desc="Esta sección está reservada para aprobar o rechazar perfiles nuevos."
      />
    );
  }

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .eq("status", "pending")
    .order("created_at");

  return <RequestsView pending={pending ?? []} />;
}
