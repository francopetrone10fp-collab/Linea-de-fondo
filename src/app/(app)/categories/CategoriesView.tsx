"use client";

import { useMemo, useState, useTransition } from "react";
import { ColorBadge } from "@/components/Badge";
import { Empty, TrashIcon } from "@/app/(app)/teams/TeamsView";
import { createCategory, deleteCategory } from "./actions";

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function CategoriesView({
  categories,
  counts,
  canDeleteCategories,
}: {
  categories: Category[];
  counts: Record<string, number>;
  canDeleteCategories: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCategory(name);
      if (!res.ok) setError(res.error);
      else setName("");
    });
  }

  function onDelete(id: string, categoryName: string) {
    if (!confirm(`¿Eliminar la categoría "${categoryName}"? Los partidos que ya la tienen cargada van a quedar sin categoría.`))
      return;
    startTransition(async () => {
      await deleteCategory(id);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">Categorías ({categories.length})</h1>
        <form onSubmit={onCreate} className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Superliga"
            className="min-w-[220px]"
          />
          <button
            disabled={isPending}
            className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-ink rounded-lg font-semibold text-[13.5px] px-4 py-2.5"
          >
            + Agregar categoría
          </button>
        </form>
      </div>
      {error && <p className="text-bad-text text-[12.5px] mb-3">{error}</p>}

      <div className="bg-surface-2 border border-line rounded-[9px] px-3.5 py-2.5 text-[12.5px] text-text-dim mb-5">
        Directorio de categorías/divisiones (ej. Superliga, U19) para asignar a cada partido.
      </div>

      {categories.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría por nombre..."
            className="min-w-[240px] w-full max-w-[360px]"
          />
        </div>
      )}

      {categories.length === 0 ? (
        <Empty title="Todavía no hay categorías cargadas" desc="Agregá la primera para empezar el directorio." />
      ) : filteredCategories.length === 0 ? (
        <Empty title="Sin resultados" desc={`Ninguna categoría coincide con "${search}".`} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {filteredCategories.map((c) => {
            const count = counts[c.id] ?? 0;
            return (
              <div key={c.id} className="bg-surface border border-line rounded-[11px] p-3.5 flex items-center gap-2.5">
                <ColorBadge name={c.name} color={c.color} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-text-faint">
                    {count} partido{count === 1 ? "" : "s"}
                  </div>
                </div>
                {canDeleteCategories && (
                  <button
                    onClick={() => onDelete(c.id, c.name)}
                    title="Eliminar categoría"
                    className="text-text-faint hover:text-bad-text hover:bg-bad-bg p-1 rounded-md"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
