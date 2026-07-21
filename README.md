# Línea de Fondo — Sala de video arbitral

Plataforma de evaluación arbitral en video: partidos, clips por jugada, roles
(Coordinador General / Instructor / Árbitro), directorio de equipos y
árbitros, material didáctico e informes por partido.

Migrado desde un prototipo de archivo único (HTML/JS + `window.storage`) a
una app real: **Next.js (App Router)** + **Supabase** (Postgres, Auth,
Storage, Row Level Security) + **Vercel**.

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com/dashboard) y creá un proyecto nuevo.
2. Andá a **SQL Editor** y corré, en orden, los archivos de `supabase/migrations/`:
   - `0001_init.sql` — esquema completo + Row Level Security + bucket de avatars.
   - `0002_seed_directories.sql` — carga el directorio inicial de equipos (Superliga) y árbitros.
3. Andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public` key
   - `service_role` key (¡secreta! nunca la expongas en el cliente ni la subas a git)

No hace falta configurar nada más de Auth: los usuarios se crean desde el
propio backend de la app (ver sección 3).

## 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá con los valores de tu proyecto:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 3. Cómo funciona el login (importante)

El prototipo original solo pedía **nombre + clave** para entrar (sin email).
Para no romper esa experiencia pero migrar a autenticación real, la app
genera un email sintético y determinístico a partir del nombre
(`nombre-slug@usuarios.lineadefondo.app`) y crea el usuario en Supabase Auth
con `email_confirm: true` — nunca se envía (ni se intenta enviar) un correo
real. La clave sí es la que carga la persona, con el hash y las sesiones que
maneja Supabase Auth (no hay hash casero ni recuperación de clave todavía).

Reglas de rol preservadas del prototipo (`src/lib/constants.ts`):
- Nombres del directorio de árbitros semilla → solo pueden pedir rol Árbitro.
- Nombres especiales hardcodeados → Instructor o Coordinador automático.
- Cualquier otro nombre → elige rol y queda `pending` hasta que el
  Coordinador General lo apruebe en **Solicitudes** — excepto la primera
  cuenta creada en todo el sistema, que se autoaprueba (caso de arranque).

## 4. Correr en local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). La primera cuenta que
crees queda como Coordinador General automáticamente si tu nombre coincide
con la regla especial, o se autoaprueba por ser la primera cuenta del
sistema.

## 5. Deploy en Vercel

1. Subí este repo a GitHub (ya está en la rama `claude/migration-production-3t80ac`).
2. En [vercel.com/new](https://vercel.com/new), importá el repo.
3. Cargá las mismas 3 variables de entorno del paso 2 en **Project Settings → Environment Variables**.
4. Deploy. Con el plan gratis de Vercel + el free tier de Supabase alcanza para este uso.

## 6. Qué se preservó del prototipo original

- Los 3 roles y sus permisos exactos (quién evalúa, quién finaliza, quién
  elimina, quién aprueba solicitudes) — ver `supabase/migrations/0001_init.sql`
  (políticas de RLS) y `src/lib/session.ts`.
- La escala de evaluación por clip (Mala / Estándar / Buena / Relevante).
- Finalizar/reabrir partidos, con bloqueo de edición mientras está finalizado.
- Fusión de árbitros duplicados (ahora como transacción real contra la base,
  no solo en el cliente).
- El informe por partido (gráfico de torta + barras + tabla), descargable
  como HTML autocontenido.
- La paleta de colores, tipografías (Oswald + Inter + IBM Plex Mono) y
  sistema de componentes del diseño original.

## 7. Qué se dejó afuera a propósito

- Los datos de prueba del prototipo (perfiles, partidos, clips) — arranca
  con la base vacía salvo el directorio semilla de equipos/árbitros.
- Los *workarounds* de sandbox del prototipo (modal de confirmación propio,
  "copiar link" en vez de abrir pestaña, descarga de HTML en vez de
  imprimir) — acá se usan `confirm()` nativo y enlaces `target="_blank"`
  directos, porque ya no hace falta el workaround fuera de Claude.

## 8. Seguridad: qué cambió realmente

En el prototipo, el control de acceso por rol vivía **solo en el cliente**
(cualquiera con las herramientas de desarrollador podía ver todo). Acá, cada
tabla tiene Row Level Security en Postgres: un árbitro literalmente no puede
leer partidos ajenos ni partidos propios no finalizados, sin importar qué
haga en el navegador — la base de datos lo garantiza.
