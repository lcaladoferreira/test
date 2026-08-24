import { YoutubeTranscript } from "youtube-transcript";

type Body = {
  url?: string;
  videoId?: string;
  language?: string;
  includeSegments?: boolean;
};

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
  if (req.method !== "POST") {
    return Response.json({ error: "POST required" }, { status: 405 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const source = body.videoId ?? body.url ?? "";
  const videoId = extractVideoId(source);
  if (!videoId) {
    return Response.json(
      { error: "Provide a valid YouTube URL or 11-character videoId" },
      { status: 400 },
    );
  }

  try {
    const rows = await YoutubeTranscript.fetchTranscript(
      videoId,
      body.language ? { lang: body.language } : undefined,
    );

    const transcript = rows
      .map((r: any) => String(r.text ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ");

    const payload: any = {
      success: true,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      languageRequested: body.language ?? null,
      transcript,
      wordCount: transcript ? transcript.split(/\s+/).length : 0,
      characterCount: transcript.length,
      fetchedAt: new Date().toISOString(),
    };

    if (body.includeSegments) {
      payload.segments = rows.map((r: any) => ({
        text: r.text,
        offsetMs: Number(r.offset ?? 0),
        durationMs: Number(r.duration ?? 0),
      }));
    }

    return Response.json(payload);
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        videoId,
        error: "Transcript unavailable",
        detail: String(error?.message ?? error),
      },
      { status: 422 },
    );
  }
}
