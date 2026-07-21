import { createClient } from "@/lib/supabase/server";
import { requireProfile, isCoordinador } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar profile={profile} pendingCount={pendingCount} />
      <main className="flex-1 min-w-0 px-8 py-6 pb-16">
        <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5 flex gap-2 items-start">
          <span>
            Los datos se guardan en Supabase y son visibles según el rol de cada perfil (control de
            acceso reforzado con Row Level Security).
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
