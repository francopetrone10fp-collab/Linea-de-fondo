import Link from "next/link";
import { requireProfile, getNavBadges } from "@/lib/session";
import { NAV_ITEMS, initials, navLabel } from "@/lib/constants";
import { RolePill } from "@/components/Sidebar";
import SectionIcon, { TILE_COLOR, TILE_STYLES } from "@/components/SectionIcon";

// Pantalla de inicio: antes había que abrir el menú (el hamburger de
// "☰ Menú" en mobile) para ver a qué secciones tenés acceso. Ahora el menú
// ES la pantalla de inicio — los mismos accesos del Sidebar, filtrados por
// rol, como tarjetas grandes y tocables, cada una con su propio color para
// ubicarse rápido.
export default async function InicioPage() {
  const profile = await requireProfile();
  const { pendingCount, disponibilidadPendiente } = await getNavBadges(profile);
  const items = NAV_ITEMS.filter((item) => item.view !== "inicio" && (item.roles as readonly string[]).includes(profile.role));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="w-12 h-12 rounded-full bg-accent text-accent-ink flex items-center justify-center font-semibold text-[15px] font-display flex-none overflow-hidden">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            initials(profile.name)
          )}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight">Hola, {profile.name.split(" ")[0]}</h1>
          <RolePill role={profile.role} />
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {items.map((item) => {
          if (item.view === "competitions") {
            return (
              <Link
                key={item.view}
                href={item.href}
                className="relative bg-accent hover:bg-accent-dim rounded-2xl p-4 flex flex-col items-start justify-between gap-3 min-h-[120px]"
              >
                <SectionIcon view={item.view} />
                <span className="font-display font-bold uppercase tracking-wide text-[14.5px] leading-snug text-accent-ink">
                  {navLabel(item, profile.role)}
                </span>
              </Link>
            );
          }

          const color = TILE_COLOR[item.view] ?? "blue";
          const style = TILE_STYLES[color];
          const badgeCount = item.view === "requests" && pendingCount > 0 ? pendingCount : null;
          const badgeDot = item.view === "disponibilidad" && disponibilidadPendiente;

          return (
            <Link
              key={item.view}
              href={item.href}
              className={`relative overflow-hidden ${style.bg} border ${style.border} hover:brightness-110 rounded-2xl p-4 flex flex-col items-start justify-between gap-3 min-h-[120px]`}
            >
              <span className={`absolute top-0 left-0 right-0 h-[3px] ${style.bar}`} />
              <SectionIcon view={item.view} />
              <span className={`font-display font-bold uppercase tracking-wide text-[14.5px] leading-snug ${style.text}`}>
                {navLabel(item, profile.role)}
              </span>
              {badgeCount != null && (
                <span className="absolute top-3 right-3 bg-accent text-accent-ink text-[10px] font-bold rounded-[10px] px-1.5">
                  {badgeCount}
                </span>
              )}
              {badgeDot && (
                <span
                  className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber"
                  title="Te falta cargar la disponibilidad del fin de semana"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
