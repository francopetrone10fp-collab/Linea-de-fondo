"use client";

import { useRef, useState } from "react";
import { initials } from "@/lib/constants";

export function ColorBadge({
  name,
  color,
  photoUrl,
  size = 22,
  editable = false,
  onUpload,
}: {
  name: string;
  color: string;
  photoUrl?: string | null;
  size?: number;
  editable?: boolean;
  onUpload?: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const label = photoUrl ? null : initials(name);
  // Las iniciales suelen ser 2 letras (equipos/árbitros); si el nombre trae
  // un acrónimo más largo entre paréntesis (ej. "FBPSF"), achicamos la letra
  // para que entre en el círculo en vez de recortarse.
  const fontSize = Math.round(size * 0.4 * (label ? Math.min(1, 2 / label.length) : 1));
  const bigFontSize = Math.round(90 * (label ? Math.min(1, 2 / label.length) : 1));

  return (
    <>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Ver foto de ${name} ampliada`}
        className="rounded-full text-white inline-flex items-center justify-center font-display font-bold flex-none overflow-hidden leading-none cursor-pointer"
        style={{ width: size, height: size, fontSize, background: color }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          label
        )}
      </span>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6"
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-white/80 hover:text-white w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl leading-none"
          >
            ✕
          </button>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4">
            <span
              className="rounded-full text-white inline-flex items-center justify-center font-display font-bold overflow-hidden leading-none flex-none"
              style={{ width: "min(70vw, 320px)", height: "min(70vw, 320px)", fontSize: bigFontSize, background: color }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
              ) : (
                label
              )}
            </span>
            <p className="text-white text-[15px] font-semibold m-0">{name}</p>
            {editable && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="bg-accent hover:bg-accent-dim text-accent-ink rounded-lg font-semibold text-[13px] px-4 py-2"
                >
                  Cambiar foto
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUpload?.(file);
                      setOpen(false);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
