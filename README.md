# YouTube Data APIs for AI Agents — x402 / USDC on Base

**Pay per call. No signup.** Low-cost YouTube transcript, captions and video-to-text APIs built for autonomous agents, LLM/RAG pipelines, research and automation.

## Live paid endpoints

Base URL:

`https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb`

| API | Price | Endpoint |
|---|---:|---|
| YouTube Transcript | **$0.004** | `/youtube-transcript` |
| YouTube Captions | **$0.004** | `/youtube-captions` |
| YouTube Video to Text | **$0.004** | `/youtube-video-to-text` |

These are the endpoints currently treated as publicly verified/live. Additional aliases and products are in the repository but are not advertised here as live until Bankr deployment is verified.

## What the premium transcript returns

- clean transcript text
- JSON / plain text / SRT output
- timestamped segments
- language selection
- manual vs auto-generated caption preference
- optional caption translation where available
- word and character counts

## Call it

```bash
curl -X POST \
  'https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/youtube-transcript' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","format":"text"}'
```

An x402-capable client receives the payment challenge, pays USDC on Base, and retries the request with payment proof.

## Agent discovery

Machine-readable catalog: [`docs/api-catalog.json`](docs/api-catalog.json)

LLM discovery file: [`docs/llms.txt`](docs/llms.txt)

Keywords: **YouTube transcript API, captions API, subtitles API, video to text API, x402 API, AI agent API, RAG API, USDC Base**.

## Why use it

- micropayment instead of subscription
- no API signup flow for buyers
- inexpensive enough for autonomous agent loops
- structured output for downstream LLM/RAG ingestion
- x402-native payment on Base

The repository intentionally avoids fabricated reviews, usage counts or customer claims.
