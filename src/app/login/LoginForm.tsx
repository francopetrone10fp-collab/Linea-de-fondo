"use client";

import { useEffect, useState, useTransition } from "react";
import { checkNameStatus, signIn, signUp } from "./actions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/lib/database.types";

const ROLE_CARDS: { role: Role; title: string; desc: string }[] = [
  {
    role: "coordinador",
    title: "Coordinador General",
    desc: "Ve todo el equipo, evalúa clips y puede eliminar contenido.",
  },
  {
    role: "instructor",
    title: "Instructor",
    desc: "Ve todo el equipo, evalúa y deja reportes pedagógicos.",
  },
  {
    role: "arbitro",
    title: "Árbitro",
    desc: "Ve solo sus propios clips y sus propias estadísticas.",
  },
];

export default function LoginForm() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [knownUserExists, setKnownUserExists] = useState<boolean | null>(null);
  const [assignedRole, setAssignedRole] = useState<Role | null>(null);
  const [existingRoleLabel, setExistingRoleLabel] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ name: string; roleLabel: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const timer = setTimeout(async () => {
      const res = await checkNameStatus(trimmed);
      if (res.knownUserExists === true) {
        setKnownUserExists(true);
        setExistingRoleLabel(ROLE_LABELS[res.existingRole!]);
      } else if (res.knownUserExists === false) {
        setKnownUserExists(false);
        setAssignedRole(res.assignedRole ?? null);
        setSelectedRole(res.assignedRole ?? null);
      } else {
        setKnownUserExists(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [name]);

  function handleNameChange(value: string) {
    setName(value);
    setError(null);
    if (!value.trim()) {
      setKnownUserExists(null);
      setAssignedRole(null);
      setExistingRoleLabel(null);
      setSelectedRole(null);
    }
  }

  const canSubmit =
    knownUserExists === true
      ? name.trim() && password.length >= 4
      : knownUserExists === false
        ? name.trim() && selectedRole && password.length >= 4 && password === password2
        : false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (knownUserExists) {
        const res = await signIn({ name, password });
        if (!res.ok) setError(res.error);
        else if (res.pending) setPending({ name: res.name, roleLabel: res.roleLabel });
      } else {
        if (!selectedRole) {
          setError("Elegí un rol para crear el perfil.");
          return;
        }
        const res = await signUp({ name, role: selectedRole, password, password2 });
        if (!res.ok) setError(res.error);
        else if (res.pending) setPending({ name: res.name, roleLabel: res.roleLabel });
      }
    });
  }

  if (pending) {
    return (
      <div className="w-full max-w-[480px] bg-surface border border-line rounded-2xl p-8">
        <Brand />
        <h1 className="font-display text-[21px] mt-0 mb-1.5">Perfil pendiente de aprobación</h1>
        <p className="text-[13px] text-text-dim mb-5 leading-relaxed">
          Hola {pending.name}. Tu perfil se creó pidiendo el rol <b>{pending.roleLabel}</b>, pero
          todavía lo tiene que aprobar el Coordinador General. Probá de nuevo más tarde.
        </p>
        <button
          className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          onClick={() => {
            setPending(null);
            setName("");
            setPassword("");
            setPassword2("");
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px] bg-surface border border-line rounded-2xl p-8">
      <Brand />
      <h1 className="font-display text-[21px] mt-0 mb-1.5">Ingresá a tu perfil</h1>
      <p className="text-[13px] text-text-dim mb-5 leading-relaxed">
        {knownUserExists === true
          ? `Ingresá la clave de ${name.trim()} (${existingRoleLabel}).`
          : knownUserExists === false
            ? assignedRole
              ? "Este nombre todavía no tiene perfil. Reconocemos quién sos, así que tu rol ya está definido."
              : "Este nombre todavía no tiene perfil. Elegí el rol que querés pedir y creá una clave — el Coordinador General lo tiene que aprobar."
            : "Escribí tu nombre para entrar. Si es la primera vez, vas a crear tu perfil con una clave."}
      </p>

      <form onSubmit={handleSubmit}>
        <Field label="Tu nombre">
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Martina Gómez"
            autoComplete="off"
            className="w-full"
          />
        </Field>

        <Field label="Clave">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="off"
            className="w-full"
          />
        </Field>

        {knownUserExists === false && (
          <>
            <Field label="Repetir clave">
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••"
                autoComplete="off"
                className="w-full"
              />
            </Field>
            <p className="text-[11px] text-text-faint -mt-1.5 mb-3.5">
              Este nombre todavía no tiene perfil — vas a crear uno nuevo.
            </p>

            {assignedRole ? (
              <div className="bg-surface-2 border border-line rounded-lg px-3.5 py-3 mb-3.5">
                <div className="text-[12px] text-text-faint mb-0.5">
                  Tu rol para este nombre ya está definido:
                </div>
                <RolePill role={assignedRole} />
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {ROLE_CARDS.map((c) => (
                  <button
                    type="button"
                    key={c.role}
                    onClick={() => setSelectedRole(c.role)}
                    className={`text-left flex flex-col gap-0.5 px-3.5 py-3 rounded-[10px] border bg-surface-2 ${
                      selectedRole === c.role ? "border-accent bg-surface-3" : "border-line"
                    }`}
                  >
                    <span className="font-semibold text-[13.5px]">{c.title}</span>
                    <span className="text-[11.5px] text-text-dim leading-snug">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && <p className="text-bad-text text-[12.5px] -mt-1.5 mb-3.5">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
        >
          {isPending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="text-[11px] text-text-faint leading-relaxed mt-4 flex gap-1.5">
        <span>
          Tu clave nunca se guarda en texto plano: la autenticación corre sobre Supabase Auth.
        </span>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 mb-5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C79A3D" strokeWidth={2}>
        <circle cx="9" cy="15" r="6" />
        <path d="M14 11 L21 4 M21 4 L21 8 M21 4 L17 4" />
        <circle cx="9" cy="15" r="1.6" fill="#C79A3D" stroke="none" />
      </svg>
      <div className="font-display font-semibold text-[18px]">Línea de Fondo</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 mb-3.5">
      <label className="text-[12.5px] text-text-dim font-medium">{label}</label>
      {children}
    </div>
  );
}

function RolePill({ role }: { role: Role }) {
  if (role === "arbitro") {
    return (
      <span className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-3 text-text-dim">
        {ROLE_LABELS[role]}
      </span>
    );
  }
  const style =
    role === "coordinador"
      ? { background: "var(--role-coordinador-bg)", color: "var(--role-coordinador-text)" }
      : { background: "var(--role-instructor-bg)", color: "var(--role-instructor-text)" };
  return (
    <span className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={style}>
      {ROLE_LABELS[role]}
    </span>
  );
}
