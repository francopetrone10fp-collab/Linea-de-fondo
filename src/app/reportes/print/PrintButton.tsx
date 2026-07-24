"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-accent text-accent-ink rounded-lg font-semibold text-[13px] px-3.5 py-2"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
