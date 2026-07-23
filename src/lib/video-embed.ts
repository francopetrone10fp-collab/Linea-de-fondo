export type VideoEmbed =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "drive"; embedUrl: string }
  | { kind: "file"; url: string }
  | { kind: "unknown"; url: string };

const FILE_EXTENSIONS = ["mp4", "webm", "ogg", "ogv", "mov", "m4v"];

// YouTube expresa el punto de inicio en el parámetro `t` (a veces `start`),
// ya sea en segundos puros ("198") o en formato compuesto ("1h2m3s", "1m30s").
function parseYouTubeStartSeconds(parsed: URL): number | null {
  const raw = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;
  const [, h, m, s] = match;
  if (!h && !m && !s) return null;
  return parseInt(h || "0", 10) * 3600 + parseInt(m || "0", 10) * 60 + parseInt(s || "0", 10);
}

function youtubeEmbedUrl(id: string, parsed: URL): string {
  const start = parseYouTubeStartSeconds(parsed);
  const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  if (start && start > 0) embed.searchParams.set("start", String(start));
  return embed.toString();
}

export function parseVideoEmbed(rawUrl: string): VideoEmbed {
  const url = rawUrl.trim();
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unknown", url };
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube: watch?v=, youtu.be/<id>, /embed/<id>, /shorts/<id>
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    let id = parsed.searchParams.get("v");
    if (!id) {
      const match = parsed.pathname.match(/^\/(embed|shorts|live)\/([a-zA-Z0-9_-]+)/);
      if (match) id = match[2];
    }
    if (id) return { kind: "youtube", embedUrl: youtubeEmbedUrl(id, parsed) };
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\//, "");
    if (id) return { kind: "youtube", embedUrl: youtubeEmbedUrl(id, parsed) };
  }

  // Vimeo: vimeo.com/<id>, player.vimeo.com/video/<id>
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = parsed.pathname.match(/(\d+)/);
    if (match) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${match[1]}` };
  }

  // Google Drive: /file/d/<id>/..., ?id=<id>
  if (host === "drive.google.com") {
    let id: string | null = null;
    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (match) id = match[1];
    if (!id) id = parsed.searchParams.get("id");
    if (id) return { kind: "drive", embedUrl: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Archivo de video directo, por extensión
  const ext = parsed.pathname.split(".").pop()?.toLowerCase();
  if (ext && FILE_EXTENSIONS.includes(ext)) {
    return { kind: "file", url };
  }

  return { kind: "unknown", url };
}
