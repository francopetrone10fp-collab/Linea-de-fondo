import sharp from "sharp";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { matchTeamByName, colorForTeam, initials } from "@/lib/constants";

// Imagen que acompaña al push de una designación/partido: los dos escudos
// (o iniciales sobre un círculo de color, si el equipo no tiene logo) con un
// "VS" al medio, con la estética de Línea de Fondo. Se genera al vuelo (no se
// guarda en Storage) porque el payload del push tiene que ser chico — solo
// viaja la URL, y el navegador la pide aparte al mostrar la notificación.
const CIRCLE = 220;
const CANVAS_W = 720;
const CANVAS_H = 360;
const BG = "#0B0F14";
const GOLD = "#C79A3D";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function circleMaskSvg(): Buffer {
  return Buffer.from(`<svg width="${CIRCLE}" height="${CIRCLE}"><circle cx="${CIRCLE / 2}" cy="${CIRCLE / 2}" r="${CIRCLE / 2}" fill="#fff"/></svg>`);
}

function initialsCircleSvg(name: string, color: string): Buffer {
  return Buffer.from(`<svg width="${CIRCLE}" height="${CIRCLE}">
    <circle cx="${CIRCLE / 2}" cy="${CIRCLE / 2}" r="${CIRCLE / 2}" fill="${color}" />
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${CIRCLE * 0.36}" font-weight="700" fill="#fff">${escapeXml(initials(name))}</text>
  </svg>`);
}

async function circleFor(name: string, color: string, photoUrl: string | null): Promise<Buffer> {
  if (photoUrl) {
    try {
      const res = await fetch(photoUrl);
      if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        return await sharp(bytes)
          .resize(CIRCLE, CIRCLE, { fit: "cover" })
          .composite([{ input: circleMaskSvg(), blend: "dest-in" }])
          .png()
          .toBuffer();
      }
    } catch {
      // Si el logo no se pudo descargar, cae al círculo con iniciales de abajo.
    }
  }
  return sharp(initialsCircleSvg(name, color)).png().toBuffer();
}

export async function buildMatchupImage(localName: string, visitName: string): Promise<Buffer> {
  const supabase = createServiceRoleClient();
  const { data: teams } = await supabase.from("teams").select("name, color, photo_url");
  const list = teams ?? [];

  const local = matchTeamByName(list, localName);
  const visit = matchTeamByName(list, visitName);

  const [localCircle, visitCircle] = await Promise.all([
    circleFor(localName, local?.color ?? colorForTeam(localName), local?.photo_url ?? null),
    circleFor(visitName, visit?.color ?? colorForTeam(visitName), visit?.photo_url ?? null),
  ]);

  const backdrop = Buffer.from(`<svg width="${CANVAS_W}" height="${CANVAS_H}">
    <rect width="100%" height="100%" fill="${BG}" />
    <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="700" fill="${GOLD}">VS</text>
  </svg>`);

  return sharp(backdrop)
    .composite([
      { input: localCircle, left: 70, top: Math.round((CANVAS_H - CIRCLE) / 2) },
      { input: visitCircle, left: CANVAS_W - CIRCLE - 70, top: Math.round((CANVAS_H - CIRCLE) / 2) },
    ])
    .png()
    .toBuffer();
}
