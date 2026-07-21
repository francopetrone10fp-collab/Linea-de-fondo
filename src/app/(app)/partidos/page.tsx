import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isArbitro, canEvaluate } from "@/lib/session";
import { fetchPartidosFull } from "./queries";
import { Empty } from "@/app/(app)/teams/TeamsView";

export default async function PartidosPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const partidos = await fetchPartidosFull(supabase);

  const counts: Record<string, number> = {};
  partidos.forEach((p) => {
    counts[p.temporada] = (counts[p.temporada] ?? 0) + 1;
  });
  const seasons = Object.keys(counts).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const title = isArbitro(profile) ? "Mis partidos" : "Partidos";

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
      </div>

      {seasons.length === 0 ? (
        <Empty
          title={isArbitro(profile) ? "Todavía no tenés partidos finalizados" : "Todavía no hay partidos"}
          desc={
            isArbitro(profile)
              ? "Cuando un Coordinador o Instructor finalice la evaluación de un partido tuyo, va a aparecer acá con su informe."
              : "Registrá el primer partido para empezar el historial."
          }
          action={
            canEvaluate(profile) ? (
              <Link
                href={`/partidos/${new Date().getFullYear()}`}
                className="bg-accent hover:bg-accent-dim text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5 inline-block"
              >
                Agregar partido
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {seasons.map((season) => (
            <Link
              key={season}
              href={`/partidos/${encodeURIComponent(season)}`}
              className="bg-surface border border-line rounded-xl p-5 flex items-center gap-3.5 hover:border-text-faint"
            >
              <span className="w-11 h-11 rounded-[10px] bg-surface-3 text-accent flex items-center justify-center flex-none">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
              </span>
              <div>
                <div className="font-display text-[17px] font-semibold">
                  {season === "Sin fecha" ? "Sin fecha" : `Temporada ${season}`}
                </div>
                <div className="text-[12px] text-text-faint mt-0.5">
                  {counts[season]} partido{counts[season] === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
