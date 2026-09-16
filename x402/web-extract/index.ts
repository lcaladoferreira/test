import { load } from "cheerio";
import TurndownService from "turndown";

type ExtractBody = {
  url?: string;
  format?: "json" | "text" | "markdown";
  includeLinks?: boolean;
  includeMetadata?: boolean;
  maxChars?: number;
};

type RpcBody = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const MCP_VERSION = "2026-07-28";
const SERVER_INFO = { name: "agent-web-extract", version: "1.0.0" };

class HttpError extends Error {
  status: number;
  code: string;
  detail?: unknown;
  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function errorJson(err: unknown): Response {
  const e = err instanceof HttpError
    ? err
    : new HttpError(500, "INTERNAL_ERROR", "Unexpected extraction error", String((err as any)?.message ?? err));
  return Response.json(
    { success: false, error: { code: e.code, message: e.message, ...(e.detail === undefined ? {} : { detail: e.detail }) } },
    { status: e.status, headers: { "cache-control": "no-store" } },
  );
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return false;
  const n = parts.map(Number);
  if (n.some((x) => x < 0 || x > 255)) return false;
  const [a, b] = n;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(h)) return true;
  if (h.startsWith("::ffff:")) return isPrivateIpv4(h.slice(7));
  return false;
}

function validateTarget(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new HttpError(400, "INVALID_URL", "url is required");
  }
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new HttpError(400, "INVALID_URL", "url must be a valid absolute URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new HttpError(400, "UNSAFE_URL", "Only http and https URLs are allowed");
  }
  if (u.username || u.password) {
    throw new HttpError(400, "UNSAFE_URL", "Embedded URL credentials are not allowed");
  }
  if (u.port && u.port !== "80" && u.port !== "443") {
    throw new HttpError(400, "UNSAFE_URL", "Only standard web ports 80 and 443 are allowed");
  }
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "169.254.169.254" ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  ) {
    throw new HttpError(400, "UNSAFE_URL", "Private, local, link-local and metadata-service targets are blocked");
  }
  return u;
}

function parseOptions(body: ExtractBody): Required<Pick<ExtractBody, "format" | "includeLinks" | "includeMetadata" | "maxChars">> {
  const format = body.format ?? "json";
  if (!(["json", "text", "markdown"] as const).includes(format)) {
    throw new HttpError(400, "INVALID_FORMAT", "format must be json, text, or markdown");
  }
  const maxChars = body.maxChars ?? 30_000;
  if (!Number.isInteger(maxChars) || maxChars < 500 || maxChars > 100_000) {
    throw new HttpError(400, "INVALID_MAX_CHARS", "maxChars must be an integer between 500 and 100000");
  }
  return {
    format,
    includeLinks: body.includeLinks !== false,
    includeMetadata: body.includeMetadata !== false,
    maxChars,
  };
}

async function fetchSafe(initial: URL): Promise<{ response: Response; finalUrl: URL; bytes: Uint8Array; durationMs: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let current = initial;
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "AgentWebExtract/1.0 (+x402 autonomous-agent web extractor)",
          accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.2",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new HttpError(422, "BAD_REDIRECT", "Upstream returned a redirect without a Location header");
        if (redirects === MAX_REDIRECTS) throw new HttpError(422, "TOO_MANY_REDIRECTS", "Upstream exceeded redirect limit");
        current = validateTarget(new URL(location, current).toString());
        continue;
      }

      if (!response.ok) {
        throw new HttpError(422, "UPSTREAM_HTTP_ERROR", `Upstream returned HTTP ${response.status}`, { upstreamStatus: response.status });
      }

      const declared = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declared) && declared > MAX_BYTES) {
        throw new HttpError(413, "RESPONSE_TOO_LARGE", "Upstream response exceeds the 5 MB limit");
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.byteLength > MAX_BYTES) {
        throw new HttpError(413, "RESPONSE_TOO_LARGE", "Upstream response exceeds the 5 MB limit");
      }
      return { response, finalUrl: current, bytes: buffer, durationMs: Date.now() - started };
    }
    throw new HttpError(422, "TOO_MANY_REDIRECTS", "Upstream exceeded redirect limit");
  } catch (err: any) {
    if (err?.name === "AbortError") throw new HttpError(504, "FETCH_TIMEOUT", "Upstream fetch exceeded 15 seconds");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function absolutize(base: URL, href: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function parseHtml(html: string, finalUrl: URL, maxChars: number, includeLinks: boolean, includeMetadata: boolean) {
  const $ = load(html);
  const title = normalizeText($("title").first().text() || $("meta[property='og:title']").attr("content") || "") || null;
  const description = normalizeText(
    $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "",
  ) || null;
  const language = $("html").attr("lang")?.trim() || null;
  const canonicalRaw = $("link[rel='canonical']").attr("href") || "";
  const canonical = canonicalRaw ? absolutize(finalUrl, canonicalRaw) : null;
  const author = normalizeText(
    $("meta[name='author']").attr("content") || $("meta[property='article:author']").attr("content") || "",
  ) || null;
  const publishedAt =
    $("meta[property='article:published_time']").attr("content") ||
    $("meta[name='date']").attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    null;

  const openGraph: Record<string, string> = {};
  if (includeMetadata) {
    $("meta[property^='og:']").each((_, el) => {
      const key = $(el).attr("property")?.trim();
      const value = $(el).attr("content")?.trim();
      if (key && value && Object.keys(openGraph).length < 50) openGraph[key] = value;
    });
  }

  const jsonLd: unknown[] = [];
  if (includeMetadata) {
    $("script[type='application/ld+json']").each((_, el) => {
      if (jsonLd.length >= 20) return;
      const raw = $(el).text().trim();
      if (!raw || raw.length > 250_000) return;
      try {
        jsonLd.push(JSON.parse(raw));
      } catch {}
    });
  }

  const links: Array<{ text: string; url: string }> = [];
  if (includeLinks) {
    const seen = new Set<string>();
    $("a[href]").each((_, el) => {
      if (links.length >= 200) return;
      const href = $(el).attr("href");
      if (!href) return;
      const url = absolutize(finalUrl, href);
      if (!url || seen.has(url)) return;
      seen.add(url);
      links.push({ text: normalizeText($(el).text()).slice(0, 300), url });
    });
  }

  $("script,style,noscript,template,svg,canvas,iframe,nav,footer,aside,form,[aria-hidden='true']").remove();
  const root = $("article").first().text().trim().length >= 200
    ? $("article").first()
    : $("main").first().text().trim().length >= 200
      ? $("main").first()
      : $("body").first();

  const content = root.clone();
  content.find("br").replaceWith("\n");
  content.find("p,div,section,article,li,h1,h2,h3,h4,h5,h6,blockquote,pre,tr").each((_, el) => {
    $(el).append("\n");
  });
  const text = normalizeText(content.text()).slice(0, maxChars);
  if (!text) throw new HttpError(422, "NO_EXTRACTABLE_TEXT", "No readable text could be extracted from the page");

  const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  turndown.remove(["script", "style", "noscript", "iframe", "svg", "canvas", "form"]);
  const markdown = normalizeText(turndown.turndown(root.html() || "")).slice(0, maxChars);

  return {
    title,
    description,
    language,
    text,
    markdown,
    links,
    metadata: includeMetadata ? { canonical, author, publishedAt, openGraph, jsonLd } : {},
  };
}

async function extract(body: ExtractBody) {
  const sourceUrl = validateTarget(body.url);
  const options = parseOptions(body);
  const { response, finalUrl, bytes, durationMs } = await fetchSafe(sourceUrl);
  const contentType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  if (contentType.includes("json") || /^[\s\n\r]*[\[{]/.test(decoded)) {
    let data: unknown;
    try {
      data = JSON.parse(decoded);
    } catch {
      throw new HttpError(422, "INVALID_UPSTREAM_JSON", "Upstream advertised JSON but returned invalid JSON");
    }
    const text = JSON.stringify(data, null, 2).slice(0, options.maxChars);
    return {
      result: {
        success: true,
        sourceUrl: sourceUrl.toString(),
        finalUrl: finalUrl.toString(),
        fetchedAt: new Date().toISOString(),
        title: null,
        description: null,
        language: null,
        contentType,
        text,
        data,
        links: [],
        metadata: {},
        stats: { httpStatus: response.status, bytes: bytes.byteLength, characters: text.length, durationMs },
      },
      representation: text,
      format: options.format,
    };
  }

  const allowedText = contentType.startsWith("text/") || contentType.includes("html") || contentType.includes("xml") || contentType === "application/octet-stream";
  if (!allowedText) throw new HttpError(415, "UNSUPPORTED_CONTENT_TYPE", `Unsupported upstream content type: ${contentType}`);

  if (!contentType.includes("html") && !/<html[\s>]/i.test(decoded)) {
    const text = normalizeText(decoded).slice(0, options.maxChars);
    if (!text) throw new HttpError(422, "NO_EXTRACTABLE_TEXT", "No readable text could be extracted");
    return {
      result: {
        success: true,
        sourceUrl: sourceUrl.toString(),
        finalUrl: finalUrl.toString(),
        fetchedAt: new Date().toISOString(),
        title: null,
        description: null,
        language: null,
        contentType,
        text,
        links: [],
        metadata: {},
        stats: { httpStatus: response.status, bytes: bytes.byteLength, characters: text.length, durationMs },
      },
      representation: text,
      format: options.format,
    };
  }

  const parsed = parseHtml(decoded, finalUrl, options.maxChars, options.includeLinks, options.includeMetadata);
  const result = {
    success: true,
    sourceUrl: sourceUrl.toString(),
    finalUrl: finalUrl.toString(),
    fetchedAt: new Date().toISOString(),
    title: parsed.title,
    description: parsed.description,
    language: parsed.language,
    contentType,
    text: parsed.text,
    links: parsed.links,
    metadata: parsed.metadata,
    stats: { httpStatus: response.status, bytes: bytes.byteLength, characters: parsed.text.length, durationMs },
  };
  return { result, representation: options.format === "markdown" ? parsed.markdown : parsed.text, format: options.format };
}

function mcpResponse(id: RpcBody["id"], result: unknown, status = 200): Response {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, result },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "MCP-Protocol-Version": MCP_VERSION,
      },
    },
  );
}

function mcpError(id: RpcBody["id"], code: number, message: string, data?: unknown, status = 400): Response {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } },
    { status, headers: { "cache-control": "no-store", "MCP-Protocol-Version": MCP_VERSION } },
  );
}

const toolSchema = {
  name: "extract_web",
  title: "Real-time Web Extractor",
  description: "Fetch a public HTTP(S) URL in real time and return normalized readable content, links, metadata and provenance.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", format: "uri", description: "Public HTTP(S) URL to fetch" },
      format: { type: "string", enum: ["json", "text", "markdown"], default: "json" },
      includeLinks: { type: "boolean", default: true },
      includeMetadata: { type: "boolean", default: true },
      maxChars: { type: "integer", minimum: 500, maximum: 100000, default: 30000 },
    },
    required: ["url"],
    additionalProperties: false,
  },
  outputSchema: { type: "object" },
};

async function handleMcp(req: Request, rpc: RpcBody): Promise<Response> {
  const headerVersion = req.headers.get("MCP-Protocol-Version");
  if (headerVersion && headerVersion !== MCP_VERSION) {
    return mcpError(rpc.id, -32022, "Unsupported protocol version", { supported: [MCP_VERSION] }, 400);
  }
  const routedMethod = req.headers.get("Mcp-Method");
  if (routedMethod && routedMethod !== rpc.method) {
    return mcpError(rpc.id, -32020, "Mcp-Method header does not match JSON-RPC method", undefined, 400);
  }
  if (rpc.method === "server/discover") {
    return mcpResponse(rpc.id, {
      resultType: "complete",
      supportedVersions: [MCP_VERSION],
      capabilities: { tools: {} },
      instructions: "Use extract_web for paid real-time public web extraction and normalization.",
      _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
    });
  }
  if (rpc.method === "tools/list") {
    return mcpResponse(rpc.id, { resultType: "complete", tools: [toolSchema], _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO } });
  }
  if (rpc.method === "tools/call") {
    if (rpc.params?.name !== "extract_web") return mcpError(rpc.id, -32602, "Unknown tool", { supported: ["extract_web"] }, 400);
    const routedName = req.headers.get("Mcp-Name");
    if (routedName && routedName !== "extract_web") return mcpError(rpc.id, -32020, "Mcp-Name header does not match tool name", undefined, 400);
    try {
      const out = await extract((rpc.params?.arguments ?? {}) as ExtractBody);
      return mcpResponse(rpc.id, {
        resultType: "complete",
        content: [{ type: "text", text: JSON.stringify(out.result) }],
        structuredContent: out.result,
        isError: false,
        _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
      });
    } catch (err) {
      const e = err instanceof HttpError ? err : new HttpError(500, "INTERNAL_ERROR", "Unexpected extraction error");
      return mcpResponse(rpc.id, {
        resultType: "complete",
        content: [{ type: "text", text: JSON.stringify({ success: false, error: { code: e.code, message: e.message } }) }],
        structuredContent: { success: false, error: { code: e.code, message: e.message } },
        isError: true,
        _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
      }, e.status >= 500 ? 500 : 200);
    }
  }
  return mcpError(rpc.id, -32601, "Method not found", undefined, 404);
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "POST required" } }, { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } }, { status: 400 });
  }

  if (body?.jsonrpc === "2.0" && typeof body?.method === "string") {
    return handleMcp(req, body as RpcBody);
  }

  try {
    const out = await extract(body as ExtractBody);
    if (out.format === "text") {
      return new Response(out.representation, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-source-url": out.result.finalUrl },
      });
    }
    if (out.format === "markdown") {
      return new Response(out.representation, {
        status: 200,
        headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store", "x-source-url": out.result.finalUrl },
      });
    }
    return Response.json(out.result, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (err) {
    return errorJson(err);
  }
}
