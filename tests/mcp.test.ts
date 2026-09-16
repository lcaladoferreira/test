import { describe,expect,it } from "vitest";
import { isPaidMcpCall, TOOL_NAME } from "../src/mcp.js";

describe("MCP payment gate routing",()=>{it("requires payment only for the extraction tool call",()=>{expect(isPaidMcpCall({method:"tools/list"})).toBe(false);expect(isPaidMcpCall({method:"server/discover"})).toBe(false);expect(isPaidMcpCall({method:"tools/call",params:{name:TOOL_NAME}})).toBe(true)})});
