import { initials } from "@/lib/constants";

export function ColorBadge({
  name,
  color,
  photoUrl,
  size = 22,
}: {
  name: string;
  color: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const label = photoUrl ? null : initials(name);
  // Las iniciales suelen ser 2 letras (equipos/árbitros); si el nombre trae
  // un acrónimo más largo entre paréntesis (ej. "FBPSF"), achicamos la letra
  // para que entre en el círculo en vez de recortarse.
  const fontSize = Math.round(size * 0.4 * (label ? Math.min(1, 2 / label.length) : 1));
  return (
    <span
      className="rounded-full text-white inline-flex items-center justify-center font-display font-bold flex-none overflow-hidden leading-none"
      style={{ width: size, height: size, fontSize, background: color }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
      ) : (
        label
      )}
    </span>
  );
}
