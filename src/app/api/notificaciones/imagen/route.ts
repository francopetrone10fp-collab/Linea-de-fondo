import { NextResponse } from "next/server";
import { buildMatchupImage } from "@/lib/push/matchImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El navegador pide esta imagen aparte al mostrar el push (el payload viaja
// solo con la URL, no con la imagen), así que no requiere sesión — nombres y
// escudos de equipo no son datos sensibles.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const local = searchParams.get("local");
  const visitante = searchParams.get("visitante");
  if (!local || !visitante) {
    return NextResponse.json({ error: "Faltan los equipos" }, { status: 400 });
  }

  const buffer = await buildMatchupImage(local, visitante);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
