"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useTransition } from "react";
import { logout } from "@/app/login/actions";
import { updateMyPhotoUrl } from "@/app/(app)/profile-actions";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, initials } from "@/lib/constants";
import type { SessionProfile } from "@/lib/session";

const NAV_ITEMS = [
  { view: "partidos", href: "/partidos", label: "Partidos", roles: ["coordinador", "instructor", "arbitro"] },
  { view: "stats", href: "/stats", label: "Estadísticas", roles: ["coordinador", "instructor"] },
  { view: "teams", href: "/teams", label: "Equipos", roles: ["coordinador", "instructor"] },
  { view: "referees", href: "/referees", label: "Árbitros", roles: ["coordinador", "instructor"] },
  { view: "competitions", href: "/competitions", label: "Competencias", roles: ["coordinador", "instructor"] },
  { view: "reportes", href: "/reportes", label: "Reportes", roles: ["coordinador", "instructor"] },
  { view: "requests", href: "/requests", label: "Solicitudes", roles: ["coordinador"] },
  { view: "material", href: "/material", label: "Material didáctico", roles: ["coordinador", "instructor", "arbitro"] },
] as const;

export default function Sidebar({
  profile,
  pendingCount,
}: {
  profile: SessionProfile;
  pendingCount: number;
}) {
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      try {
        const blob = await resizeImageToBlob(file, 240);
        const supabase = createClient();
        const path = `users/${profile.id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (uploadError) return;
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        await updateMyPhotoUrl(`${publicUrl}?v=${Date.now()}`);
      } catch {
        // imagen inválida, no hacemos nada
      }
    });
  }

  return (
    <div className="relative z-10 w-[220px] flex-none bg-surface border-r border-line p-6 flex flex-col gap-5 md:flex md:flex-col">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C79A3D" strokeWidth={2}>
            <circle cx="9" cy="15" r="6" />
            <path d="M14 11 L21 4 M21 4 L21 8 M21 4 L17 4" />
            <circle cx="9" cy="15" r="1.6" fill="#C79A3D" stroke="none" />
          </svg>
          <div className="font-display font-bold text-[19px] tracking-wide uppercase leading-tight">
            Línea de
            <br />
            Fondo
          </div>
        </div>
        <div className="text-[12px] text-text-faint">Sala de video arbitral</div>
      </div>

      <div className="flex items-center gap-2.5 p-2.5 bg-surface-2 rounded-[9px]">
        <button
          onClick={() => fileRef.current?.click()}
          title="Cambiar foto de perfil"
          className="w-8 h-8 rounded-full bg-accent text-accent-ink flex items-center justify-center font-semibold text-[13px] font-display flex-none overflow-hidden cursor-pointer"
          disabled={isPending}
        >
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            initials(profile.name)
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
            {profile.name}
          </div>
          <RolePill role={profile.role} />
          <br />
          <form action={logout}>
            <button className="text-[11px] text-text-faint bg-transparent border-none cursor-pointer underline p-0 mt-0.5">
              Cambiar perfil
            </button>
          </form>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => (item.roles as readonly string[]).includes(profile.role)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.view}
              href={item.href}
              className={`flex items-center gap-2.5 border-l-[3px] text-[14px] font-medium px-2.5 py-2.5 rounded-r-md ${
                active
                  ? "border-accent text-text bg-surface-2"
                  : "border-transparent text-text-dim hover:bg-surface-2 hover:text-text"
              }`}
            >
              {item.label}
              {item.view === "requests" && pendingCount > 0 && (
                <span className="bg-accent text-accent-ink text-[10px] font-bold rounded-[10px] px-1.5">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-[11px] text-text-faint leading-relaxed hidden md:block">
        Los datos se guardan y son visibles según el rol de cada perfil.
      </div>
    </div>
  );
}

function RolePill({ role }: { role: SessionProfile["role"] }) {
  if (role === "arbitro") {
    return (
      <span className="inline-block text-[9.5px] font-bold uppercase tracking-wide px-1.5 rounded-full bg-surface-3 text-text-dim">
        {ROLE_LABELS[role]}
      </span>
    );
  }
  const style =
    role === "coordinador"
      ? { background: "var(--role-coordinador-bg)", color: "var(--role-coordinador-text)" }
      : { background: "var(--role-instructor-bg)", color: "var(--role-instructor-text)" };
  return (
    <span className="inline-block text-[9.5px] font-bold uppercase tracking-wide px-1.5 rounded-full" style={style}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function resizeImageToBlob(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Imagen demasiado pesada"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar"))), "image/jpeg", 0.82);
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}
