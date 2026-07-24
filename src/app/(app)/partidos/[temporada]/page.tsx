import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro } from "@/lib/session";
import { fetchPartidosFull } from "../queries";
import { categorySlugFor } from "../PartidoCard";
import { Empty } from "@/app/(app)/teams/TeamsView";

export default async function TemporadaCategoriesPage({ params }: { params: Promise<{ temporada: string }> }) {
  const { temporada } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const allPartidos = await fetchPartidosFull(supabase);
  const temporadaDecoded = decodeURIComponent(temporada);
  const partidos = allPartidos.filter((p) => p.temporada === temporadaDecoded);

  const counts: Record<string, number> = {};
  const names: Record<string, string> = {};
  partidos.forEach((p) => {
    const slug = categorySlugFor(p);
    counts[slug] = (counts[slug] ?? 0) + 1;
    names[slug] = p.category?.name ?? "Sin categoría";
  });
  const slugs = Object.keys(counts).sort((a, b) => {
    if (a === "sin-categoria") return 1;
    if (b === "sin-categoria") return -1;
    return names[a].localeCompare(names[b]);
  });

  const title = isArbitro(profile) ? "Mis partidos" : `Temporada ${temporadaDecoded}`;

  return (
    <div>
      <Link href="/partidos" className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a temporadas
      </Link>

      <h1 className="font-display text-2xl font-semibold mb-5">{title}</h1>

      {slugs.length === 0 ? (
        <Empty title="No hay partidos en esta temporada" desc="Registrá el primero desde Partidos." />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {slugs.map((slug) => (
            <Link
              key={slug}
              href={`/partidos/${encodeURIComponent(temporadaDecoded)}/${encodeURIComponent(slug)}`}
              className="bg-surface border border-line rounded-xl p-5 flex items-center gap-3.5 hover:border-text-faint"
            >
              <span className="w-11 h-11 rounded-[10px] bg-surface-3 text-accent flex items-center justify-center flex-none">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
              </span>
              <div>
                <div className="font-display text-[17px] font-semibold">{names[slug]}</div>
                <div className="text-[12px] text-text-faint mt-0.5">
                  {counts[slug]} partido{counts[slug] === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
