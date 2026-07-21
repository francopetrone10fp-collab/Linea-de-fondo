"use client";

import { useState, useTransition } from "react";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { ROLE_LABELS } from "@/lib/constants";
import { approveRequest, rejectRequest } from "./actions";
import type { Role } from "@/lib/database.types";

interface PendingUser {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export default function RequestsView({ pending }: { pending: PendingUser[] }) {
  const [roleChoice, setRoleChoice] = useState<Record<string, Role>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-5">Solicitudes de acceso</h1>
      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Estos perfiles se crearon pidiendo un rol que no reconocimos automáticamente. Elegí el rol
        correcto y aprobalos, o rechazalos si no corresponde.
      </div>

      {pending.length === 0 ? (
        <Empty
          title="No hay solicitudes pendientes"
          desc="Cuando alguien nuevo cree su perfil, va a aparecer acá si no reconocimos su rol automáticamente."
        />
      ) : (
        pending.map((u) => (
          <div
            key={u.id}
            className="bg-surface border border-line rounded-[11px] px-4 py-3.5 flex items-center gap-3.5 mb-2.5 flex-wrap"
          >
            <div>
              <div className="font-semibold text-[14px]">{u.name}</div>
              <div className="text-[11.5px] text-text-faint">
                Pidió: {ROLE_LABELS[u.role]} · {new Date(u.created_at).toLocaleDateString("es-AR")}
              </div>
            </div>
            <select
              value={roleChoice[u.id] ?? u.role}
              onChange={(e) => setRoleChoice((prev) => ({ ...prev, [u.id]: e.target.value as Role }))}
              className="ml-auto"
            >
              <option value="coordinador">Coordinador General</option>
              <option value="instructor">Instructor</option>
              <option value="arbitro">Árbitro</option>
            </select>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await approveRequest(u.id, roleChoice[u.id] ?? u.role);
                })
              }
              className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
            >
              Aprobar
            </button>
            <button
              disabled={isPending}
              onClick={() => {
                if (!confirm(`¿Rechazar y eliminar el perfil de "${u.name}"?`)) return;
                startTransition(async () => {
                  await rejectRequest(u.id);
                });
              }}
              className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
            >
              Rechazar
            </button>
          </div>
        ))
      )}
    </div>
  );
}
