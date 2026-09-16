import { describe,expect,it } from "vitest";
import { isBlockedIp, validateUrlShape } from "../src/url-guard.js";

describe("SSRF guard",()=>{it("blocks private and loopback IPs",()=>{for(const ip of ["127.0.0.1","10.0.0.1","172.16.1.1","192.168.1.1","169.254.169.254","::1","fc00::1"])expect(isBlockedIp(ip)).toBe(true)});it("blocks unsafe schemes and credentials",()=>{expect(()=>validateUrlShape("file:///etc/passwd")).toThrow();expect(()=>validateUrlShape("http://user:pass@example.com")).toThrow();expect(()=>validateUrlShape("http://localhost/x")).toThrow()});it("accepts a public https URL shape",()=>{expect(validateUrlShape("https://example.com/a").hostname).toBe("example.com")})});
