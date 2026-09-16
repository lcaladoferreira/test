# Agent Web Extract

Machine-to-machine, pay-per-success real-time web extraction and normalization for autonomous AI agents.

- **HTTP:** `POST /api/extract`
- **MCP:** `POST /mcp`, tool `extract_web`
- **Price:** $0.003 USDC per successful extraction
- **Payment:** x402 V2
- **Network:** Base mainnet (`eip155:8453`)
- **Asset:** USDC
- **Seller:** `0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb`
- **No signup / API key / human checkout**

## Request

```json
{"url":"https://example.com/article","format":"json","includeLinks":true,"includeMetadata":true,"maxChars":30000}
```

The first unpaid paid-operation request is challenged with HTTP 402. x402 authorization is verified before execution; settlement occurs only after a successful 2xx extraction response. Extraction failures use non-2xx responses so the payment middleware does not settle them.

## Discovery

`/openapi.json` · `/.well-known/x402.json` · `/SKILL.md` · `/llms.txt` · `/.well-known/agent-card.json` · `/health`

## Security

HTTP(S) only; blocks localhost/private/link-local/reserved targets and unsafe redirects; resolves DNS before fetch; 15 s timeout; 5 MB body cap; redirect cap; content-type checks.

## Environment

Optional: `X402_FACILITATOR_URL`. Defaults to `https://facilitator.payai.network`.
