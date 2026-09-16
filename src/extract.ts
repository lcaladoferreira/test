import { load } from "cheerio";
import TurndownService from "turndown";
import { LIMITS } from "./config.js";
import { HttpError } from "./errors.js";
import { validatePublicUrl } from "./url-guard.js";

export type ExtractInput = { url?: string; format?: "json" | "text" | "markdown"; includeLinks?: boolean; includeMetadata?: boolean; maxChars?: number };

function normalize(input: string) { return input.replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function absolute(base: URL, href?: string) { if (!href) return null; try { const u = new URL(href, base); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null; } catch { return null; } }

export function parseHtml(html: string, finalUrl: URL, maxChars = LIMITS.defaultChars, includeLinks = true, includeMetadata = true) {
  const $ = load(html);
  const title = normalize($("title").first().text() || $("meta[property='og:title']").attr("content") || "") || null;
  const description = normalize($("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "") || null;
  const language = $("html").attr("lang")?.trim() || null;
  const canonical = absolute(finalUrl, $("link[rel='canonical']").attr("href"));
  const author = normalize($("meta[name='author']").attr("content") || $("meta[property='article:author']").attr("content") || "") || null;
  const publishedAt = $("meta[property='article:published_time']").attr("content") || $("time[datetime]").first().attr("datetime") || null;
  const openGraph: Record<string,string> = {};
  const jsonLd: unknown[] = [];
  if (includeMetadata) {
    $("meta[property^='og:']").each((_, el) => { const k = $(el).attr("property")?.trim(); const v = $(el).attr("content")?.trim(); if (k && v && Object.keys(openGraph).length < 50) openGraph[k] = v; });
    $("script[type='application/ld+json']").each((_, el) => { if (jsonLd.length >= 20) return; const raw = $(el).text().trim(); if (!raw || raw.length > 250000) return; try { jsonLd.push(JSON.parse(raw)); } catch {} });
  }
  const links: Array<{text:string;url:string}> = [];
  if (includeLinks) { const seen = new Set<string>(); $("a[href]").each((_, el) => { if (links.length >= 200) return; const url = absolute(finalUrl, $(el).attr("href")); if (!url || seen.has(url)) return; seen.add(url); links.push({ text: normalize($(el).text()).slice(0,300), url }); }); }
  $("script,style,noscript,template,svg,canvas,iframe,nav,footer,aside,form,[aria-hidden='true']").remove();
  const article = $("article").first(); const main = $("main").first();
  const root = article.text().trim().length >= 200 ? article : main.text().trim().length >= 200 ? main : $("body").first();
  const textRoot = root.clone(); textRoot.find("br").replaceWith("\n"); textRoot.find("p,div,section,article,li,h1,h2,h3,h4,h5,h6,blockquote,pre,tr").each((_, el) => { $(el).append("\n"); });
  const text = normalize(textRoot.text()).slice(0,maxChars);
  if (!text) throw new HttpError(422,"NO_EXTRACTABLE_TEXT","No readable text could be extracted");
  const td = new TurndownService({ headingStyle:"atx", bulletListMarker:"-", codeBlockStyle:"fenced" });
  td.remove(["script","style","noscript","iframe","svg","canvas","form"]);
  const markdown = normalize(td.turndown(root.html() || "")).slice(0,maxChars);
  return { title, description, language, text, markdown, links, metadata: includeMetadata ? { canonical, author, publishedAt, openGraph, jsonLd } : {} };
}

function options(body: ExtractInput) {
  const format = body.format ?? "json"; if (!["json","text","markdown"].includes(format)) throw new HttpError(400,"INVALID_FORMAT","format must be json, text, or markdown");
  const maxChars = body.maxChars ?? LIMITS.defaultChars; if (!Number.isInteger(maxChars) || maxChars < LIMITS.minChars || maxChars > LIMITS.maxChars) throw new HttpError(400,"INVALID_MAX_CHARS",`maxChars must be ${LIMITS.minChars}-${LIMITS.maxChars}`);
  return { format, maxChars, includeLinks: body.includeLinks !== false, includeMetadata: body.includeMetadata !== false } as const;
}

async function fetchSafe(initial: URL) {
  const started = Date.now(); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs); let current = initial;
  try {
    for (let redirects=0; redirects<=LIMITS.maxRedirects; redirects++) {
      current = await validatePublicUrl(current.toString());
      const response = await fetch(current, { redirect:"manual", signal:controller.signal, headers:{ "user-agent":"AgentWebExtract/1.0 (+autonomous-agent-data-service)", accept:"text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.2" } });
      if (response.status >= 300 && response.status < 400) { const location = response.headers.get("location"); if (!location) throw new HttpError(422,"BAD_REDIRECT","Redirect without Location"); if (redirects === LIMITS.maxRedirects) throw new HttpError(422,"TOO_MANY_REDIRECTS","Redirect limit exceeded"); current = await validatePublicUrl(new URL(location,current).toString()); continue; }
      if (!response.ok) throw new HttpError(422,"UPSTREAM_HTTP_ERROR",`Upstream returned HTTP ${response.status}`,{upstreamStatus:response.status});
      const declared = Number(response.headers.get("content-length") || 0); if (declared > LIMITS.maxBytes) throw new HttpError(413,"RESPONSE_TOO_LARGE","Upstream response exceeds 5 MB");
      const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size=0;
      if (reader) { while (true) { const {done,value}=await reader.read(); if (done) break; if (!value) continue; size += value.byteLength; if (size > LIMITS.maxBytes) { await reader.cancel(); throw new HttpError(413,"RESPONSE_TOO_LARGE","Upstream response exceeds 5 MB"); } chunks.push(value); } }
      const bytes = new Uint8Array(size); let off=0; for (const c of chunks) { bytes.set(c,off); off += c.byteLength; }
      return { response, finalUrl:current, bytes, durationMs:Date.now()-started };
    }
    throw new HttpError(422,"TOO_MANY_REDIRECTS","Redirect limit exceeded");
  } catch (e:any) { if (e?.name === "AbortError") throw new HttpError(504,"FETCH_TIMEOUT","Upstream fetch exceeded 15 seconds"); throw e; } finally { clearTimeout(timer); }
}

export async function extractWeb(body: ExtractInput) {
  const sourceUrl = await validatePublicUrl(body.url); const opt = options(body); const {response,finalUrl,bytes,durationMs}=await fetchSafe(sourceUrl);
  const contentType=(response.headers.get("content-type")||"application/octet-stream").split(";")[0]!.trim().toLowerCase(); const decoded=new TextDecoder().decode(bytes);
  if (contentType.includes("json") || /^[\s\r\n]*[\[{]/.test(decoded)) { let data:unknown; try { data=JSON.parse(decoded); } catch { throw new HttpError(422,"INVALID_UPSTREAM_JSON","Upstream JSON is invalid"); } const text=JSON.stringify(data,null,2).slice(0,opt.maxChars); const result={success:true,sourceUrl:sourceUrl.toString(),finalUrl:finalUrl.toString(),fetchedAt:new Date().toISOString(),title:null,description:null,language:null,contentType,text,data,links:[],metadata:{},stats:{httpStatus:response.status,bytes:bytes.byteLength,characters:text.length,durationMs}}; return {result,representation:text,format:opt.format}; }
  if (!(contentType.startsWith("text/") || contentType.includes("html") || contentType.includes("xml") || contentType === "application/octet-stream")) throw new HttpError(415,"UNSUPPORTED_CONTENT_TYPE",`Unsupported content type: ${contentType}`);
  if (!contentType.includes("html") && !/<html[\s>]/i.test(decoded)) { const text=normalize(decoded).slice(0,opt.maxChars); if (!text) throw new HttpError(422,"NO_EXTRACTABLE_TEXT","No readable text could be extracted"); const result={success:true,sourceUrl:sourceUrl.toString(),finalUrl:finalUrl.toString(),fetchedAt:new Date().toISOString(),title:null,description:null,language:null,contentType,text,links:[],metadata:{},stats:{httpStatus:response.status,bytes:bytes.byteLength,characters:text.length,durationMs}}; return {result,representation:text,format:opt.format}; }
  const parsed=parseHtml(decoded,finalUrl,opt.maxChars,opt.includeLinks,opt.includeMetadata); const result={success:true,sourceUrl:sourceUrl.toString(),finalUrl:finalUrl.toString(),fetchedAt:new Date().toISOString(),title:parsed.title,description:parsed.description,language:parsed.language,contentType,text:parsed.text,links:parsed.links,metadata:parsed.metadata,stats:{httpStatus:response.status,bytes:bytes.byteLength,characters:parsed.text.length,durationMs}}; return {result,representation:opt.format === "markdown" ? parsed.markdown : parsed.text,format:opt.format};
}
