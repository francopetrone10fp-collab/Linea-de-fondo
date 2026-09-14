import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import { mondayOf, addDays } from "@/lib/weekUtils";
import AppShell from "@/components/AppShell";
import CourtBackdrop from "@/components/CourtBackdrop";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  let pendingCount = 0;
  let disponibilidadPendiente = false;
  const supabase = await createClient();
  if (isCoordinador(profile)) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }
  if (profile.referee_id) {
    const monday = mondayOf(new Date().toISOString().slice(0, 10));
    const { data } = await supabase
      .from("disponibilidades")
      .select("fecha")
      .eq("referee_id", profile.referee_id)
      .in("fecha", [addDays(monday, 5), addDays(monday, 6)]);
    disponibilidadPendiente = (data?.length ?? 0) < 2;
  }

  return (
    <>
      <CourtBackdrop variant="dashboard" />
      <AppShell profile={profile} pendingCount={pendingCount} disponibilidadPendiente={disponibilidadPendiente}>
        {children}
      </AppShell>
    </>
  );
}
