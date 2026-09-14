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
}: {
  listId: string;
  referees: { id: string; name: string }[];
  value: string;
  onChange: (refereeId: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const selected = referees.find((r) => r.id === value);
  const [text, setText] = useState(selected?.name ?? "");

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setText("");
      if (value) onChange("");
      return;
    }
    const match = referees.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      setText(match.name);
      if (match.id !== value) onChange(match.id);
    } else {
      // No coincide con ningún árbitro: volvemos al último valor válido.
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
    </>
  );
}
