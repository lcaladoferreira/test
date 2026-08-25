export default async function handler(req, res) {
  try {
    const url = req.query?.url || req.body?.url;
    if (!url) return res.status(400).json({ error: 'Missing YouTube url' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube url' });

    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'user-agent': 'Mozilla/5.0' }
    });
    if (!watch.ok) return res.status(502).json({ error: 'Unable to fetch YouTube page' });

    const html = await watch.text();
    const m = html.match(/"captionTracks":(\[.*?\])/);
    if (!m) return res.status(404).json({ error: 'No captions available' });

    const tracks = JSON.parse(m[1].replace(/\\u0026/g, '&'));
    const track = tracks.find(t => t.kind !== 'asr') || tracks[0];
    if (!track?.baseUrl) return res.status(404).json({ error: 'No transcript track available' });

    const xmlResp = await fetch(track.baseUrl, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!xmlResp.ok) return res.status(502).json({ error: 'Unable to fetch captions' });
    const xml = await xmlResp.text();

    const text = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map(x => decodeEntities(x[1]))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return res.status(200).json({ videoId, text });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Transcript failed' });
  }
}

function extractVideoId(input) {
  try {
    const u = new URL(input);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.findIndex(p => ['shorts', 'embed', 'live'].includes(p));
    return i >= 0 ? parts[i + 1] : null;
  } catch { return null; }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
