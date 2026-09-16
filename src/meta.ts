import {
  ASSET,
  ASSET_SYMBOL,
  NETWORK,
  PAY_TO,
  PRICE_USDC,
  SERVICE_NAME,
  VERSION,
} from "./config.js";

export function publicBase(req: Request) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export function x402Manifest(base: string) {
  return {
    name: SERVICE_NAME,
    version: VERSION,
    description: "Paid real-time web extraction and normalization for autonomous AI agents.",
    protocol: "x402",
    x402Version: 2,
    network: NETWORK,
    asset: { symbol: ASSET_SYMBOL, address: ASSET, decimals: 6 },
    payTo: PAY_TO,
    pricing: {
      unit: "successful_call",
      amount: PRICE_USDC,
      currency: "USDC",
      settlement: "success-only",
    },
    endpoints: {
      api: `${base}/api/extract`,
      mcp: `${base}/mcp`,
      openapi: `${base}/openapi.json`,
      skill: `${base}/SKILL.md`,
      llms: `${base}/llms.txt`,
      agentCard: `${base}/.well-known/agent-card.json`,
    },
    capabilities: [
      "html-extraction",
      "json-passthrough",
      "normalized-text",
      "markdown",
      "links",
      "metadata",
      "open-graph",
      "json-ld",
      "ssrf-guard",
      "mcp:extract_web",
    ],
  };
}

export function agentCard(base: string) {
  return {
    name: SERVICE_NAME,
    description: "Machine-payable real-time web extraction and normalization.",
    version: VERSION,
    url: base,
    capabilities: { streaming: false, pushNotifications: false },
    skills: [
      {
        id: "extract_web",
        name: "Extract Web",
        description: "Fetch and normalize a public HTTP(S) page or JSON resource.",
        tags: ["web", "extraction", "x402", "mcp"],
        examples: ["Extract https://example.com/article as markdown"],
      },
    ],
    interfaces: {
      http: `${base}/api/extract`,
      mcp: `${base}/mcp`,
      openapi: `${base}/openapi.json`,
    },
  };
}

export function openapi(base: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: SERVICE_NAME,
      version: VERSION,
      description: "Pay-per-success real-time web extraction for autonomous agents.",
    },
    servers: [{ url: base }],
    paths: {
      "/api/extract": {
        post: {
          summary: "Extract and normalize a public web resource",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string", format: "uri" },
                    format: {
                      type: "string",
                      enum: ["json", "text", "markdown"],
                      default: "json",
                    },
                    includeLinks: { type: "boolean", default: true },
                    includeMetadata: { type: "boolean", default: true },
                    maxChars: {
                      type: "integer",
                      minimum: 500,
                      maximum: 100000,
                      default: 30000,
                    },
                  },
                  required: ["url"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Successful extraction" },
            "400": { description: "Invalid or unsafe request" },
            "402": {
              description: "x402 payment required",
              headers: { "PAYMENT-REQUIRED": { schema: { type: "string" } } },
            },
            "413": { description: "Response too large" },
            "415": { description: "Unsupported content type" },
            "422": { description: "Upstream/extraction error" },
            "504": { description: "Fetch timeout" },
          },
        },
      },
      "/mcp": {
        post: {
          summary: "MCP Streamable HTTP endpoint; tools/list is free, extract_web is x402-paid",
          responses: {
            "200": { description: "MCP JSON-RPC response" },
            "402": { description: "Payment required for extract_web" },
          },
        },
      },
      "/health": {
        get: { responses: { "200": { description: "Healthy" } } },
      },
      "/.well-known/x402.json": {
        get: { responses: { "200": { description: "x402 service manifest" } } },
      },
    },
  };
}

export function skill(base: string) {
  return `# Agent Web Extract\n\nReal-time web extraction and normalization for autonomous AI agents.\n\n- HTTP: ${base}/api/extract\n- MCP: ${base}/mcp\n- Tool: extract_web\n- Price: $${PRICE_USDC} USDC per successful extraction\n- Payment: x402 V2 on Base mainnet (${NETWORK})\n- payTo: ${PAY_TO}\n\n## HTTP call\nPOST ${base}/api/extract\nContent-Type: application/json\n\n{\"url\":\"https://example.com/article\",\"format\":\"json\"}\n\nAn unpaid call returns HTTP 402 with x402 payment requirements. Failed extraction responses are non-2xx and must not settle.\n`;
}

export function llms(base: string) {
  return `${SERVICE_NAME}\nPurpose: real-time public web extraction and normalization for autonomous agents.\nHTTP: ${base}/api/extract\nMCP: ${base}/mcp (tool extract_web)\nOpenAPI: ${base}/openapi.json\nPayment: x402 V2; Base mainnet ${NETWORK}; USDC; $${PRICE_USDC} per successful call.\nSeller: ${PAY_TO}\nNo signup. No API key. No human checkout.\n`;
}
