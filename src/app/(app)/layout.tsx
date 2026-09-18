import { requireProfile, getNavBadges } from "@/lib/session";
import AppShell from "@/components/AppShell";
import CourtBackdrop from "@/components/CourtBackdrop";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const { pendingCount, disponibilidadPendiente } = await getNavBadges(profile);

  return (
    <>
      <CourtBackdrop variant="dashboard" />
      <AppShell profile={profile} pendingCount={pendingCount} disponibilidadPendiente={disponibilidadPendiente}>
        {children}
      </AppShell>
    </>
  );
}
