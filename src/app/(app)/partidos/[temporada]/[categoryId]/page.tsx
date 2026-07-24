import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro, canEvaluate } from "@/lib/session";
import { fetchPartidosFull, fetchAllClipsMinimal, fetchAllReadsMinimal } from "../../queries";
import { categorySlugFor } from "../../PartidoCard";
import TemporadaListView from "../TemporadaListView";

const SIN_CATEGORIA = "sin-categoria";

export default async function CategoryPartidosPage({
  params,
}: {
  params: Promise<{ temporada: string; categoryId: string }>;
}) {
  const { temporada, categoryId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [allPartidos, clips, reads, { data: teams }, { data: referees }, { data: categories }, { data: competitions }] =
    await Promise.all([
      fetchPartidosFull(supabase),
      fetchAllClipsMinimal(supabase),
      fetchAllReadsMinimal(supabase),
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("referees").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("competitions").select("id, name").order("name"),
    ]);

  const temporadaDecoded = decodeURIComponent(temporada);
  const partidos = allPartidos.filter(
    (p) => p.temporada === temporadaDecoded && categorySlugFor(p) === categoryId
  );
  const categoryName =
    categoryId === SIN_CATEGORIA ? "Sin categoría" : (categories ?? []).find((c) => c.id === categoryId)?.name;

  const clipsByPartido: Record<string, typeof clips> = {};
  clips.forEach((c) => {
    (clipsByPartido[c.partido_id] ??= []).push(c);
  });

  const readRefereeIdsByPartido: Record<string, string[]> = {};
  reads.forEach((r) => {
    (readRefereeIdsByPartido[r.partido_id] ??= []).push(r.referee_id);
  });

  return (
    <div>
      <Link
        href={`/partidos/${encodeURIComponent(temporadaDecoded)}`}
        className="text-text-dim hover:text-text text-[13px] flex items-center gap-1.5 mb-4 w-fit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a categorías
      </Link>

      <TemporadaListView
        temporada={temporadaDecoded}
        partidos={partidos}
        clipsByPartido={clipsByPartido}
        readRefereeIdsByPartido={readRefereeIdsByPartido}
        teams={teams ?? []}
        referees={referees ?? []}
        categories={categories ?? []}
        competitions={competitions ?? []}
        defaultCategoryId={categoryId === SIN_CATEGORIA ? undefined : categoryId}
        title={
          isArbitro(profile)
            ? "Mis partidos"
            : `${categoryName ?? "Sin categoría"} — Temporada ${temporadaDecoded}`
        }
        canCreate={canEvaluate(profile)}
        canFilterByReferee={!isArbitro(profile)}
        showReadStatus={canEvaluate(profile)}
      />
    </div>
  );
}
