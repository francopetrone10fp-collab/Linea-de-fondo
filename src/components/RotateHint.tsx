"use client";

import { useEffect, useState } from "react";

// Un solo dismiss vale para toda la sesión de navegación (no re-aparece en
// cada pantalla que lo usa una vez que el usuario lo cerró una vez).
const DISMISS_KEY = "ldf_rotate_hint_dismissed";

export default function RotateHint({
  message = "Para una mejor experiencia, girá el celular a horizontal.",
}: {
  message?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    function update() {
      setShow(mql.matches && sessionStorage.getItem(DISMISS_KEY) !== "1");
    }
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="md:hidden flex items-center gap-2.5 bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-4">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="flex-none text-accent"
      >
        <rect x="7" y="2" width="10" height="16" rx="2" />
        <path d="M4 13a8 8 0 0 0 13.5 5.5M20 11a8 8 0 0 0-13.5-5.5" />
        <path d="M17.5 15.5 20 18l1-3.2" />
      </svg>
      <span className="flex-1">{message}</span>
      <button
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="flex-none text-text-faint hover:text-text w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-3"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
