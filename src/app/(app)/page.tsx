import Link from "next/link";
import { requireProfile, getNavBadges } from "@/lib/session";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";

// Pantalla de inicio: antes había que abrir el menú (el hamburger de
// "☰ Menú" en mobile) para ver a qué secciones tenés acceso. Ahora el menú
// ES la pantalla de inicio — los mismos accesos del Sidebar, filtrados por
// rol, como tarjetas grandes y tocables.
export default async function InicioPage() {
  const profile = await requireProfile();
  const { pendingCount, disponibilidadPendiente } = await getNavBadges(profile);
  const items = NAV_ITEMS.filter((item) => item.view !== "inicio" && (item.roles as readonly string[]).includes(profile.role));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold mb-1.5">Hola, {profile.name.split(" ")[0]}</h1>
        <p className="text-text-dim text-[13px] m-0">Accesos disponibles para tu perfil ({ROLE_LABELS[profile.role]}).</p>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {items.map((item) => {
          const badgeCount = item.view === "requests" && pendingCount > 0 ? pendingCount : null;
          const badgeDot = item.view === "disponibilidad" && disponibilidadPendiente;
          return (
            <Link
              key={item.view}
              href={item.href}
              className="relative bg-surface border border-line hover:border-text-faint rounded-2xl p-4 flex flex-col items-start gap-3 min-h-[110px]"
            >
              <span className="w-10 h-10 rounded-xl bg-surface-2 text-accent flex items-center justify-center flex-none">
                <NavIcon view={item.view} />
              </span>
              <span className="text-[13.5px] font-semibold leading-tight">{item.label}</span>
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

function NavIcon({ view }: { view: (typeof NAV_ITEMS)[number]["view"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  switch (view) {
    case "competitions":
      return (
        <svg {...common}>
          <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
          <path d="M12 13v3m-3 4h6m-6 0 1-4h4l1 4" />
        </svg>
      );
    case "stats":
      return (
        <svg {...common}>
          <path d="M4 20V10M12 20V4M20 20v-7" />
          <path d="M2 20h20" />
        </svg>
      );
    case "teams":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M2 19c0-3 3-5 7-5s7 2 7 5" />
          <path d="M17 6.5a3 3 0 0 1 0 5.8M21 19c0-2.3-1.8-4.1-4-4.8" />
        </svg>
      );
    case "referees":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
        </svg>
      );
    case "reportes":
      return (
        <svg {...common}>
          <path d="M6 3h9l3 3v15H6Z" />
          <path d="M15 3v3h3M9 12h6M9 16h6M9 8h2" />
        </svg>
      );
    case "designaciones":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
          <path d="m8.5 14.5 2 2 4-4" />
        </svg>
      );
    case "disponibilidad":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
        </svg>
      );
    case "requests":
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4Z" />
          <path d="M4 6l8 7 8-7" />
        </svg>
      );
    case "material":
      return (
        <svg {...common}>
          <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5Z" />
          <path d="M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5Z" />
        </svg>
      );
    case "clases":
      return (
        <svg {...common}>
          <path d="M12 4 2 9l10 5 10-5-10-5Z" />
          <path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
        </svg>
      );
    default:
      return null;
  }
}
