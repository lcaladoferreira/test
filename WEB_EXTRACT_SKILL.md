# Agent Web Extract — x402 Skill

Machine-to-machine real-time web extraction and normalization for autonomous agents.

## Paid endpoint

`POST https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/web-extract`

Price: **0.003 USDC per call** via x402 on Base (`eip155:8453`). No signup or API key.

USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Seller: `0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb`

## Direct request

```json
{
  "url": "https://example.com/article",
  "format": "json",
  "includeLinks": true,
  "includeMetadata": true,
  "maxChars": 30000
}
```

`format` may be `json`, `text`, or `markdown`.

The JSON result includes source/final URL, fetch time, title, description, language, content type, normalized readable text, links, canonical/author/date/OpenGraph/JSON-LD metadata, and fetch statistics.

## MCP 2026-07-28

The same paid HTTP endpoint implements the stateless MCP JSON-RPC surface with the tool `extract_web`.

Tool call headers:

```text
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: extract_web
Content-Type: application/json
```

Body:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "extract_web",
    "arguments": {
      "url": "https://example.com/article",
      "format": "json"
    }
  }
}
```

The endpoint also implements `server/discover` and `tools/list` on the same stateless JSON-RPC surface.

## x402 flow

1. POST the request without payment.
2. Read the HTTP 402 payment requirements returned by the x402 gateway.
3. Authorize the quoted Base USDC payment using an x402-compatible agent wallet/client.
4. Repeat the same request with the x402 payment proof/signature required by the challenge.
5. Consume the normalized result.

## Safety / limits

- Public HTTP(S) URLs only.
- Localhost, private/link-local/metadata-service targets and nonstandard ports are blocked.
- Redirects are revalidated.
- Fetch timeout: 15 seconds.
- Response body limit: 5 MB.
- Extracted text limit: 500–100,000 characters (`maxChars`, default 30,000).
- No LLM-generated facts; extraction is deterministic from the fetched source.

## Discovery

- OpenAPI: `https://raw.githubusercontent.com/lcaladoferreira/test/main/web-extract.openapi.json`
- MCP action metadata: `https://raw.githubusercontent.com/lcaladoferreira/test/main/mcp-actions.json`
- Source: `https://github.com/lcaladoferreira/test/tree/main/x402/web-extract`
