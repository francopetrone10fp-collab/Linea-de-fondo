"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { SessionProfile } from "@/lib/session";

export default function AppShell({
  profile,
  pendingCount,
  children,
}: {
  profile: SessionProfile;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const [showMenu, setShowMenu] = useState(false);

  function openMenu() {
    setShowMenu(true);
    window.scrollTo(0, 0);
  }

  function closeMenu() {
    setShowMenu(false);
    window.scrollTo(0, 0);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className={`${showMenu ? "block" : "hidden"} md:block`}>
        <Sidebar profile={profile} pendingCount={pendingCount} onNavigate={closeMenu} />
      </div>

      <main className={`relative z-10 flex-1 min-w-0 px-8 py-6 pb-16 ${showMenu ? "hidden md:block" : "block"}`}>
        <button
          onClick={openMenu}
          aria-label="Abrir menú"
          className="md:hidden flex items-center gap-2 -mx-8 -mt-6 mb-5 px-4 py-3.5 bg-surface border-b border-line w-[calc(100%+64px)] text-text-dim hover:text-text"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span className="font-display font-semibold text-[14.5px]">Menú</span>
        </button>

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
