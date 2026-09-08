"use client";

import { useMemo, useState, useTransition } from "react";
import { Empty } from "@/app/(app)/teams/TeamsView";
import { ROLE_LABELS } from "@/lib/constants";
import { linkProfileReferee, resetProfilePassword } from "./actions";
import type { Role } from "@/lib/database.types";

interface UserProfile {
  id: string;
  name: string;
  role: Role;
  referee_id: string | null;
}

interface RefereeOption {
  id: string;
  name: string;
}

export default function UsersView({ users, referees }: { users: UserProfile[]; referees: RefereeOption[] }) {
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="mt-8">
      <h2 className="font-display text-[19px] font-semibold mb-3.5">Usuarios</h2>
      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-4">
        Coordinador General e Instructor que también arbitran partidos necesitan tener su perfil
        vinculado a su ficha de árbitro para ver sus propias evaluaciones y confirmar la lectura del
        informe. Desde acá también se puede resetear la clave de cualquier usuario que la haya
        olvidado.
      </div>

      {users.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario por nombre..."
            className="min-w-[240px] w-full max-w-[360px]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty title="Sin resultados" desc={`Ningún usuario coincide con "${search}".`} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <UserRow key={u.id} user={u} referees={referees} onResetPassword={() => setResetTarget(u)} />
          ))}
        </div>
      )}

      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  );
}

function UserRow({
  user,
  referees,
  onResetPassword,
}: {
  user: UserProfile;
  referees: RefereeOption[];
  onResetPassword: () => void;
}) {
  const [refereeId, setRefereeId] = useState(user.referee_id ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = refereeId !== (user.referee_id ?? "");

  function onSaveReferee() {
    setSaved(false);
    startTransition(async () => {
      const res = await linkProfileReferee(user.id, refereeId || null);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <div className="bg-surface border border-line rounded-[11px] px-4 py-3.5 flex items-center gap-3.5 flex-wrap">
      <div className="min-w-[140px]">
        <div className="font-semibold text-[14px]">{user.name}</div>
        <div className="text-[11.5px] text-text-faint">{ROLE_LABELS[user.role]}</div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <label className="text-[11.5px] text-text-faint">Árbitro vinculado:</label>
        <select
          value={refereeId}
          onChange={(e) => {
            setRefereeId(e.target.value);
            setSaved(false);
          }}
          className="min-w-[160px]"
        >
          <option value="">Sin vincular</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={onSaveReferee}
          disabled={!dirty || isPending}
          className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[12.5px] px-3 py-2"
        >
          Guardar
        </button>
        {saved && <span className="text-[11.5px] text-relevant-text">Guardado ✓</span>}
      </div>

      <button
        onClick={onResetPassword}
        className="bg-transparent text-text-dim border border-line rounded-lg text-[12.5px] px-3 py-2"
      >
        Resetear clave
      </button>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError("La clave debe tener al menos 4 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las claves no coinciden.");
      return;
    }
    startTransition(async () => {
      const res = await resetProfilePassword(user.id, password);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <form onSubmit={onSubmit} className="bg-surface border border-line rounded-2xl w-full max-w-[400px] p-6">
        <h2 className="font-display text-[19px] mb-4">Resetear clave de {user.name}</h2>
        {done ? (
          <>
            <p className="text-[13px] text-relevant-text mb-4">
              Clave actualizada. Avisale la nueva clave para que pueda entrar.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1 mb-3.5">
              <label className="text-[12.5px] text-text-dim font-medium">Nueva clave</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1 mb-3.5">
              <label className="text-[12.5px] text-text-dim font-medium">Repetir clave</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••"
                className="w-full"
              />
            </div>
            {error && <p className="text-bad-text text-[12.5px] mb-2">{error}</p>}
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-transparent text-text-dim border border-line rounded-lg text-[13px] px-3 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={isPending}
                className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
              >
                Guardar clave nueva
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
