type Body = {
  url?: string;
  videoId?: string;
  language?: string;
  includeSegments?: boolean;
};

type Segment = { text: string; offsetMs: number; durationMs: number };

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

function decodeXml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function parseXmlSegments(xml: string): Segment[] {
  const rows: Segment[] = [];
  const re = /<text\s+start="([^"]+)"(?:\s+dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const text = decodeXml(m[3]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    rows.push({
      text,
      offsetMs: Math.round(Number(m[1]) * 1000),
      durationMs: Math.round(Number(m[2] ?? 0) * 1000),
    });
  }
  return rows;
}

function parseJson3Segments(data: any): Segment[] {
  const rows: Segment[] = [];
  for (const event of data?.events ?? []) {
    const text = (event?.segs ?? [])
      .map((s: any) => String(s?.utf8 ?? ""))
      .join("")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    rows.push({
      text,
      offsetMs: Number(event?.tStartMs ?? 0),
      durationMs: Number(event?.dDurationMs ?? 0),
    });
  }
  return rows;
}

async function fetchCaptionTracks(videoId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  const res = await fetch(watchUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`YouTube watch page returned ${res.status}`);
  const html = await res.text();
  const match = html.match(/"captionTracks":(\[[\s\S]*?\])(?:,"audioTracks"|,"translationLanguages"|,"defaultAudioTrackIndex")/);
  if (!match) return [];
  return JSON.parse(match[1]);
}

async function fetchSegments(baseUrl: string): Promise<Segment[]> {
  const u = new URL(baseUrl);
  u.searchParams.set("fmt", "json3");
  const jsonRes = await fetch(u.toString(), {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36" },
  });
  if (jsonRes.ok) {
    const raw = await jsonRes.text();
    if (raw.trim()) {
      try {
        const rows = parseJson3Segments(JSON.parse(raw));
        if (rows.length) return rows;
      } catch {}
    }
  }

  const xmlUrl = new URL(baseUrl);
  xmlUrl.searchParams.delete("fmt");
  const xmlRes = await fetch(xmlUrl.toString(), {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36" },
  });
  if (!xmlRes.ok) throw new Error(`Caption endpoint returned ${xmlRes.status}`);
  const xml = await xmlRes.text();
  return parseXmlSegments(xml);
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

  const videoId = extractVideoId(body.videoId ?? body.url ?? "");
  if (!videoId) {
    return Response.json({ error: "Provide a valid YouTube URL or 11-character videoId" }, { status: 400 });
  }

  try {
    const tracks: any[] = await fetchCaptionTracks(videoId);
    if (!tracks.length) {
      return Response.json({ success: false, videoId, error: "No public captions found" }, { status: 404 });
    }

    const preferred = body.language?.toLowerCase();
    const track =
      (preferred && tracks.find((t) => String(t.languageCode ?? "").toLowerCase() === preferred)) ||
      tracks.find((t) => t.kind !== "asr") ||
      tracks[0];

    const segments = await fetchSegments(track.baseUrl);
    if (!segments.length) {
      return Response.json({ success: false, videoId, error: "Caption track was found but contained no text" }, { status: 422 });
    }

    const transcript = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
    const payload: any = {
      success: true,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      language: track.languageCode ?? null,
      languageName: track.name?.simpleText ?? null,
      autoGenerated: track.kind === "asr",
      transcript,
      wordCount: transcript.split(/\s+/).filter(Boolean).length,
      characterCount: transcript.length,
      fetchedAt: new Date().toISOString(),
    };

    if (body.includeSegments) payload.segments = segments;
    return Response.json(payload);
  } catch (error: any) {
    return Response.json(
      { success: false, videoId, error: "Transcript unavailable", detail: String(error?.message ?? error) },
      { status: 422 },
    );
  }
}
