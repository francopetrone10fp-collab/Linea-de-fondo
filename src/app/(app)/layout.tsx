import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import AppShell from "@/components/AppShell";
import CourtBackdrop from "@/components/CourtBackdrop";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  let pendingCount = 0;
  if (isCoordinador(profile)) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <>
      <CourtBackdrop variant="dashboard" />
      <AppShell profile={profile} pendingCount={pendingCount}>
        {children}
      </AppShell>
    </>
  );
}
