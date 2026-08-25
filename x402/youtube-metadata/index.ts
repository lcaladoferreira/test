type Body = { url?: string; videoId?: string };

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
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const videoId = extractVideoId(body.videoId ?? body.url ?? "");
  if (!videoId) return Response.json({ error: "Provide a valid YouTube URL or 11-character videoId" }, { status: 400 });

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  try {
    const res = await fetch(oembed, { headers: { "user-agent": "x402-youtube-metadata/1.0" } });
    if (!res.ok) {
      return Response.json({ success: false, videoId, error: "Metadata unavailable", upstreamStatus: res.status }, { status: 422 });
    }
    const data: any = await res.json();
    return Response.json({
      success: true,
      videoId,
      videoUrl,
      title: data.title ?? null,
      channelName: data.author_name ?? null,
      channelUrl: data.author_url ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      thumbnailWidth: data.thumbnail_width ?? null,
      thumbnailHeight: data.thumbnail_height ?? null,
      providerName: data.provider_name ?? "YouTube",
      providerUrl: data.provider_url ?? "https://www.youtube.com/",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json({ success: false, videoId, error: "Metadata unavailable", detail: String(error?.message ?? error) }, { status: 422 });
  }
}
