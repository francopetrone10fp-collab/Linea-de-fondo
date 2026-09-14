"use client";

import { useState } from "react";

// Ojo: si el `value` cambia desde afuera (por ejemplo, otro designador
// editó la misma fila), este componente no se entera solo — el padre tiene
// que forzar un remount pasando `key={value}` (mismo patrón que se usa en
// esta pantalla para los inputs de observaciones/CT).
export default function RefereeCombobox({
  listId,
  referees,
  value,
  onChange,
  placeholder = "Buscar árbitro...",
  className = "",
  disabledIds,
}: {
  listId: string;
  referees: { id: string; name: string }[];
  value: string;
  onChange: (refereeId: string) => void;
  placeholder?: string;
  className?: string;
  // Árbitros que no se pueden elegir acá (ej: ya designados a esa misma
  // hora en otro partido). No se ocultan del datalist para no confundir,
  // pero commit() rechaza la selección.
  disabledIds?: Set<string>;
}) {
  const selected = referees.find((r) => r.id === value);
  const [text, setText] = useState(selected?.name ?? "");
  const [warning, setWarning] = useState(false);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setWarning(false);
      setText("");
      if (value) onChange("");
      return;
    }
    const match = referees.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      if (disabledIds?.has(match.id) && match.id !== value) {
        setWarning(true);
        setText(selected?.name ?? "");
        return;
      }
      setWarning(false);
      setText(match.name);
      if (match.id !== value) onChange(match.id);
    } else {
      // No coincide con ningún árbitro: volvemos al último valor válido.
      setWarning(false);
      setText(selected?.name ?? "");
    }
  }

  return (
    <>
      <input
        list={listId}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder={placeholder}
        className={className || "min-w-[150px]"}
      />
      <datalist id={listId}>
        {referees.map((r) => (
          <option key={r.id} value={r.name} />
        ))}
      </datalist>
      {warning && <div className="text-[10px] text-amber-text mt-0.5">Ya designado a esa hora</div>}
    </>
  );
}
