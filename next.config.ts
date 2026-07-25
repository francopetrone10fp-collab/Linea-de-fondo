import type { NextConfig } from "next";

// Rangos de IP privada típicos de una red local (192.168.x.x, 10.x.x.x,
// 172.16-31.x.x). Solo se usan en modo desarrollo (next dev) — en producción
// Next.js los ignora por completo.
const LAN_ORIGIN_PATTERNS = ["192.168.*.*", "10.*.*.*", "172.*.*.*"];

const nextConfig: NextConfig = {
  // Sin esto, Next.js en modo dev bloquea los recursos internos (HMR, chunks)
  // cuando el navegador entra por una IP de red (ej. http://192.168.0.9:3000)
  // en vez de localhost, porque el Origin del pedido no está en la lista
  // permitida por defecto (solo "localhost").
  allowedDevOrigins: LAN_ORIGIN_PATTERNS,
  experimental: {
    serverActions: {
      // Mismo motivo, pero para el chequeo de origen de los Server Actions
      // (el botón "Ingresar" del login, por ejemplo, depende de uno).
      allowedOrigins: LAN_ORIGIN_PATTERNS,
    },
  },
};

export default nextConfig;
