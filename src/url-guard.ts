import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HttpError } from "./errors.js";

const BLOCKED_NAMES = new Set(["localhost", "localhost.localdomain", "metadata", "metadata.google.internal", "metadata.goog", "instance-data", "169.254.169.254"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".onion"];

export function isBlockedIp(address: string): boolean {
  if (address.includes(":")) {
    const h = address.toLowerCase().replace(/^\[|\]$/g, "");
    return h === "::" || h === "::1" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith("::ffff:") || h.startsWith("64:ff9b:");
  }
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function validateUrlShape(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim()) throw new HttpError(400, "INVALID_URL", "url is required");
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new HttpError(400, "INVALID_URL", "url must be an absolute URL"); }
  if (!(["http:", "https:"] as string[]).includes(url.protocol)) throw new HttpError(400, "UNSAFE_URL", "Only http and https are allowed");
  if (url.username || url.password) throw new HttpError(400, "UNSAFE_URL", "Embedded credentials are not allowed");
  if (url.port && url.port !== "80" && url.port !== "443") throw new HttpError(400, "UNSAFE_URL", "Only ports 80 and 443 are allowed");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || BLOCKED_NAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) throw new HttpError(400, "UNSAFE_URL", "Private or local targets are blocked");
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) throw new HttpError(400, "UNSAFE_URL", "Obfuscated numeric hosts are blocked");
  if (isIP(host) && isBlockedIp(host)) throw new HttpError(400, "UNSAFE_URL", "Private, loopback, link-local and reserved IP ranges are blocked");
  return url;
}

export async function validatePublicUrl(raw: unknown): Promise<URL> {
  const url = validateUrlShape(raw);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!isIP(host)) {
    let answers: Awaited<ReturnType<typeof lookup>>;
    try { answers = await lookup(host, { all: true, verbatim: true }); } catch { throw new HttpError(422, "DNS_LOOKUP_FAILED", "Target hostname could not be resolved"); }
    if (!answers.length || answers.some((a) => isBlockedIp(a.address))) throw new HttpError(400, "UNSAFE_URL", "Target resolves to a private, loopback, link-local or reserved address");
  }
  return url;
}
