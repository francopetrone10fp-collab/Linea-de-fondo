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
  const fontSize = Math.round(size * 0.4);
  return (
    <span
      className="rounded-full text-white inline-flex items-center justify-center font-display font-bold flex-none overflow-hidden leading-none"
      style={{ width: size, height: size, fontSize, background: color }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
