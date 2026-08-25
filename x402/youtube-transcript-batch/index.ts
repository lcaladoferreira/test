import { YouTubeTranscriptApi } from "@hallelx/youtube-transcript";

type Item = { url?: string; videoId?: string; language?: string };
type Body = { videos?: Array<string | Item>; language?: string };

function extractVideoId(input: string): string | null {
  const raw = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "").split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
      return m ? m[1] : null;
    }
  } catch {}
  return null;
}

async function fetchOne(item: string | Item, defaultLanguage?: string) {
  const input = typeof item === "string" ? item : (item.videoId ?? item.url ?? "");
  const language = typeof item === "string" ? defaultLanguage : (item.language ?? defaultLanguage);
  const videoId = extractVideoId(input);
  if (!videoId) return { success: false, input, error: "Invalid YouTube URL or video ID" };

  try {
    const api = new YouTubeTranscriptApi();
    const fetched: any = await api.fetch(videoId, language ? { languages: [language] } as any : undefined);
    const raw = typeof fetched?.toRawData === "function" ? fetched.toRawData() : [];
    const segments = raw.map((s: any) => String(s.text ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const transcript = segments.join(" ").replace(/\s+/g, " ").trim();
    if (!transcript) return { success: false, videoId, error: "Transcript returned no text" };
    return {
      success: true,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      language: fetched?.languageCode ?? language ?? null,
      transcript,
      wordCount: transcript.split(/\s+/).filter(Boolean).length,
    };
  } catch (error: any) {
    return { success: false, videoId, error: "Transcript unavailable", detail: String(error?.message ?? error) };
  }
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405 });

  let body: Body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!Array.isArray(body.videos) || body.videos.length < 2 || body.videos.length > 3) {
    return Response.json({ error: "videos must contain 2 or 3 YouTube URLs/video IDs" }, { status: 400 });
  }

  const results = await Promise.all(body.videos.map((item) => fetchOne(item, body.language)));
  const successful = results.filter((r: any) => r.success).length;
  return Response.json({
    success: successful > 0,
    requested: results.length,
    successful,
    failed: results.length - successful,
    results,
    fetchedAt: new Date().toISOString(),
  });
}
