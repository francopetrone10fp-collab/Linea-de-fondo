// Fondo decorativo: líneas de cancha de básquet (círculo central, línea/aro de
// tiro libre, arco de triples) en CSS/SVG puro — sin imágenes. `fixed` + z-index
// bajo para que quede detrás de todo el contenido y no se mueva con el scroll.
function CourtLines({ opacity, strokeWidth }: { opacity: number; strokeWidth: number }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 400 520"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g fill="none" stroke="#C79A3D" strokeWidth={strokeWidth}>
        <line x1="0" y1="0" x2="400" y2="0" />
        <circle cx="200" cy="0" r="70" />
        <line x1="0" y1="520" x2="400" y2="520" />
        <rect x="140" y="380" width="120" height="140" />
        <circle cx="200" cy="380" r="60" />
        <path d="M 10 520 A 260 260 0 0 1 390 520" />
      </g>
    </svg>
  );
}

export default function CourtBackdrop({ variant = "dashboard" }: { variant?: "login" | "dashboard" }) {
  const isLogin = variant === "login";
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {isLogin && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "min(1000px, 130vmax)",
            height: "min(1000px, 130vmax)",
            background:
              "radial-gradient(circle, rgba(199,154,61,0.16) 0%, rgba(199,154,61,0.05) 45%, transparent 72%)",
          }}
        />
      )}
      {isLogin ? (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "min(640px, 88vw)", height: "min(832px, 114vw)" }}
        >
          <CourtLines opacity={0.09} strokeWidth={2.5} />
        </div>
      ) : (
        <div className="absolute inset-0">
          <CourtLines opacity={0.025} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
