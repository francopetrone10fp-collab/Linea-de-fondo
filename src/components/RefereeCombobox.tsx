"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Ojo: si el `value` cambia desde afuera (por ejemplo, otro designador
// editó la misma fila), este componente no se entera solo — el padre tiene
// que forzar un remount pasando `key={value}` (mismo patrón que se usa en
// esta pantalla para los inputs de observaciones/CT).
//
// Es un combobox propio (no <input list>/<datalist>): en iOS Safari el
// datalist nativo no filtra las opciones a medida que se escribe, muestra
// todas y hay que scrollear para encontrar el árbitro. Acá el desplegable
// se arma a mano y se filtra por texto, y se renderiza en un portal para
// que no lo recorte el scroll horizontal de la grilla.
export default function RefereeCombobox({
  referees,
  value,
  onChange,
  placeholder = "Buscar árbitro...",
  className = "",
  disabled,
  info,
}: {
  listId?: string;
  referees: { id: string; name: string }[];
  value: string;
  onChange: (refereeId: string) => void;
  placeholder?: string;
  className?: string;
  // Árbitros que no se pueden elegir acá (ej: ya designados a esa misma
  // hora en otro partido, o marcaron que no están disponibles), con el
  // motivo a mostrar. No se ocultan de la lista para no confundir, pero
  // seleccionarlos solo muestra el motivo en vez de asignarlos.
  disabled?: Map<string, string>;
  // Aviso puramente informativo (ej: ya tiene otro partido asignado otro
  // día): se muestra en la lista y debajo del input, pero no impide elegirlo.
  info?: Map<string, string>;
}) {
  const selected = referees.find((r) => r.id === value);
  const [text, setText] = useState(selected?.name ?? "");
  const [warning, setWarning] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ left: number; width: number; maxHeight: number; top?: number; bottom?: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = normalize(text.trim());
  const filtered = q ? referees.filter((r) => normalize(r.name).includes(q)) : referees;

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const margin = 8;
    const desiredHeight = 240;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const width = Math.max(r.width, 180);
    // Si no entra abajo, se abre para arriba — así siempre queda un
    // desplegable completo y navegable por scroll interno, en vez de
    // cortado contra el borde de la pantalla.
    if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
      setRect({ top: r.bottom + 4, left: r.left, width, maxHeight: Math.max(120, Math.min(desiredHeight, spaceBelow)) });
    } else {
      setRect({ bottom: window.innerHeight - r.top + 4, left: r.left, width, maxHeight: Math.max(120, Math.min(desiredHeight, spaceAbove)) });
    }
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function select(referee: { id: string; name: string }) {
    const reason = disabled?.get(referee.id);
    if (reason && referee.id !== value) {
      setWarning(reason);
      setText(selected?.name ?? "");
      setOpen(false);
      return;
    }
    setWarning(null);
    setText(referee.name);
    setOpen(false);
    if (referee.id !== value) onChange(referee.id);
  }

  function clear() {
    setWarning(null);
    setText("");
    setOpen(false);
    if (value) onChange("");
  }

  function onBlurCommit() {
    // Le damos tiempo al onMouseDown de una opción para que dispare antes del blur.
    window.setTimeout(() => {
      const trimmed = text.trim();
      if (!trimmed) {
        clear();
        return;
      }
      const exact = referees.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
      if (exact) {
        select(exact);
      } else {
        setWarning(null);
        setText(selected?.name ?? "");
        setOpen(false);
      }
    }, 150);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlight]) select(filtered[highlight]);
      else e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setOpen(false);
      setText(selected?.name ?? "");
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlurCommit}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className || "min-w-[150px]"}
      />
      {open &&
        rect &&
        filtered.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: rect.left,
              minWidth: rect.width,
              maxHeight: rect.maxHeight,
              zIndex: 1000,
              ...(rect.top != null ? { top: rect.top } : { bottom: rect.bottom }),
            }}
            className="overflow-y-auto bg-surface border border-line rounded-lg shadow-lg py-1"
          >
            {filtered.map((r, i) => {
              const reason = disabled?.get(r.id);
              const nota = !reason ? info?.get(r.id) : undefined;
              return (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(r);
                  }}
                  title={reason ?? nota}
                  className={`block w-full text-left px-2.5 py-1.5 text-[12.5px] whitespace-nowrap hover:bg-surface-2 ${
                    i === highlight ? "bg-surface-2" : ""
                  } ${reason ? "text-text-faint" : "text-text"}`}
                >
                  {r.name}
                  {reason && <span className="ml-1.5 text-amber-text">⚠</span>}
                  {nota && <span className="ml-1.5 text-text-faint">ℹ</span>}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      {warning && <div className="text-[10px] text-amber-text mt-0.5">{warning}</div>}
      {!warning && value && info?.get(value) && <div className="text-[10px] text-text-faint mt-0.5">{info.get(value)}</div>}
    </div>
  );
}
