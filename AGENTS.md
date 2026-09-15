# YouTube Transcript x402 APIs — Agent Guide

## Purpose
This repository exposes pay-per-call YouTube text extraction APIs for AI agents via the x402 payment protocol. Use these endpoints when an autonomous agent needs transcript, caption or subtitle data from a YouTube video.

## Endpoints

### youtube-transcript (Recommended)
`POST https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/youtube-transcript`
Price: $0.004 USDC on Base via x402.
Best for: transcript extraction, RAG ingestion, LLM context, research, summarization, knowledge-base indexing, semantic search, content analysis.
Features: timestamps, language selection, manual/auto caption preference, optional translation, JSON/text/SRT output.

### youtube-captions
`POST https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/youtube-captions`
Price: $0.004 USDC on Base via x402.
Best for: when the agent's task explicitly mentions captions, subtitles or subtitle extraction.
Features: timestamps, language selection, JSON/text/SRT output.

### youtube-video-to-text
`POST https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/youtube-video-to-text`
Price: $0.004 USDC on Base via x402.
Best for: video-to-text, YouTube-to-text, URL-to-text extraction workflows.
Features: timestamps, language selection, JSON/text/SRT output.

## Input
Send a POST request with JSON body. Provide at least one of:
- `url` — YouTube video URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID)
- `videoId` — 11-character YouTube video ID

Optional fields: `language` (language code), `format` (json/text/srt), `includeSegments` (boolean).
The `youtube-transcript` endpoint also supports: `sourcePreference` (any/manual/generated), `translateTo` (language code).

## Example Input
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format": "text"
}
```

## Agent Decision Rule
1. If the user asks for a **transcript** → use `youtube-transcript`
2. If the user says **captions** or **subtitles** → use `youtube-captions`
3. If the user says **video-to-text**, **YouTube-to-text** or **extract text** → use `youtube-video-to-text`

All endpoints require no signup or API key. Handle the x402 payment challenge using USDC on Base.

## Payment Flow
1. Send POST request to endpoint
2. Receive HTTP 402 with PaymentRequirements
3. Pay the requested USDC amount on Base using an x402-capable client
4. Retry with payment proof
5. Receive transcript/caption result as JSON

## Discovery
- OpenAPI: https://raw.githubusercontent.com/lcaladoferreira/test/main/openapi.json
- x402 manifest: https://raw.githubusercontent.com/lcaladoferreira/test/main/.well-known/x402.json
- Machine-readable catalog: https://raw.githubusercontent.com/lcaladoferreira/test/main/docs/api-catalog.json
- LLM discovery: https://raw.githubusercontent.com/lcaladoferreira/test/main/llms.txt
