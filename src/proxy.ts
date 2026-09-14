import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // /api queda afuera: esas rutas manejan su propia autenticación (ej. el
    // cron de recordatorios, que Vercel llama sin cookie de sesión y valida
    // con un Bearer token en su lugar).
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
