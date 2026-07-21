import { slugKey } from "@/lib/constants";

// Supabase Auth necesita un email único. El prototipo original solo pedía
// "nombre" para entrar, así que generamos un email sintético y determinístico
// a partir del nombre (nunca se envía correo real a este dominio: los
// usuarios se crean con email_confirm=true desde el server, así que Supabase
// jamás intenta mandar un mail de confirmación).
export function syntheticEmail(name: string): string {
  return `${slugKey(name)}@usuarios.lineadefondo.app`;
}
