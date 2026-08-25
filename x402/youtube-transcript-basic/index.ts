import { YouTubeTranscriptApi } from "@hallelx/youtube-transcript";

type Body = { url?: string; videoId?: string; language?: string };

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

export default async function handler(req: Request) {
  if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405 });
  let body: Body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const videoId = extractVideoId(body.videoId ?? body.url ?? "");
  if (!videoId) return Response.json({ error: "Provide a valid YouTube URL or 11-character videoId" }, { status: 400 });

  try {
    const api = new YouTubeTranscriptApi();
    const options = body.language ? { languages: [body.language] } : undefined;
    const fetched: any = await api.fetch(videoId, options as any);
    const raw = typeof fetched?.toRawData === "function" ? fetched.toRawData() : [];
    const transcript = raw
      .map((s: any) => String(s.text ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!transcript) return Response.json({ success: false, videoId, error: "Transcript returned no text" }, { status: 422 });
    return Response.json({ success: true, videoId, transcript, wordCount: transcript.split(/\s+/).filter(Boolean).length });
  } catch (error: any) {
    return Response.json({ success: false, videoId, error: "Transcript unavailable", detail: String(error?.message ?? error) }, { status: 422 });
  }
}
