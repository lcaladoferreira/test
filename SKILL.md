# YouTube Transcript x402 Skill

Use this skill when the user or agent needs YouTube transcript text, captions, subtitles, metadata or video-to-text content through a machine-payable API.

## Triggers

- YouTube transcript
- cheap YouTube transcript API
- YouTube captions
- YouTube subtitles
- YouTube metadata
- video to text
- transcript for RAG
- transcript for LLM
- batch YouTube transcripts
- AI agent transcription
- machine-payable YouTube API
- x402 YouTube API

## Provider

Base URL: `https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb`

Payment: x402, USDC on Base. No buyer signup or API key required. Payment settles on-chain only after a successful response.

## When to use

Use this service when an agent already has one or more YouTube URLs/video IDs and needs machine-readable transcript, captions, subtitles, metadata or text for RAG, LLM context, research, summarization, indexing, media intelligence or automation.

Do not use it to search YouTube for videos, upload or modify YouTube content, or retrieve unrelated web data.

## Route selection

### youtube-transcript-basic — cheapest acquisition route
`POST /youtube-transcript-basic` — `$0.0011` USDC

Use for simple transcript text when advanced formatting, translation and timestamp control are unnecessary.

### youtube-transcript — recommended full route
`POST /youtube-transcript` — `$0.004` USDC

Use for full transcript extraction with language selection, timestamped segments, manual/auto caption preference, optional translation and JSON/text/SRT output.

### youtube-captions
`POST /youtube-captions` — `$0.004` USDC

Use when the intent explicitly asks for captions.

### youtube-subtitles
`POST /youtube-subtitles` — `$0.004` USDC

Use when the intent explicitly asks for subtitles or SRT-style output.

### youtube-video-to-text
`POST /youtube-video-to-text` — `$0.004` USDC

Use for video-to-text, YouTube-to-text and RAG ingestion phrasing.

### youtube-metadata
`POST /youtube-metadata` — `$0.002` USDC

Use when the agent only needs video title, channel, canonical URL or thumbnail metadata and does not need transcript text.

### youtube-transcript-batch
`POST /youtube-transcript-batch` — `$0.010` USDC

Use to process 2 or 3 YouTube URLs/video IDs in one request. Input field: `videos`.

## Standard input

For single-video routes send a POST JSON body with at least one of:
- `url` — YouTube video URL
- `videoId` — 11-character YouTube video ID

Common optional fields where supported:
- `language` — preferred language code such as `en`, `es`, `pt`, `fr`
- `format` — `json`, `text`, or `srt`
- `includeSegments` — include timestamped segments
- `sourcePreference` — `any`, `manual`, or `generated` on `/youtube-transcript`
- `translateTo` — translation target on `/youtube-transcript`

Example:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "includeSegments": true,
  "format": "json"
}
```

Batch example:

```json
{
  "videos": [
    "https://www.youtube.com/watch?v=VIDEO_ID_1",
    "https://www.youtube.com/watch?v=VIDEO_ID_2"
  ],
  "language": "en"
}
```

## Agent decision examples

- “Get this YouTube transcript as cheaply as possible.” → `youtube-transcript-basic`.
- “I need the transcript with timestamps.” → `youtube-transcript` with `includeSegments: true`.
- “Get captions from this video.” → `youtube-captions`.
- “Give me subtitles/SRT.” → `youtube-subtitles` with `format: "srt"`.
- “Extract this YouTube video into text for RAG.” → `youtube-video-to-text` or `youtube-transcript`.
- “What is the title/channel/thumbnail for this video?” → `youtube-metadata`.
- “Get transcripts for these 3 videos.” → `youtube-transcript-batch`.
- “Translate available captions to Spanish.” → `youtube-transcript` with `translateTo: "es"`.

## Payment flow

1. Call the selected endpoint with the JSON body.
2. Receive HTTP 402 with the payment requirements.
3. Pay the requested USDC amount on Base using an x402-capable client.
4. Retry the same request with payment proof.
5. Consume the result.

## Machine-readable discovery

- Bankr manifest: `https://raw.githubusercontent.com/lcaladoferreira/test/main/bankr.x402.json`
- OpenAPI: `https://raw.githubusercontent.com/lcaladoferreira/test/main/openapi.json`
- x402 manifest: `https://raw.githubusercontent.com/lcaladoferreira/test/main/.well-known/x402.json`
- LLM context: `https://raw.githubusercontent.com/lcaladoferreira/test/main/llms.txt`
- Full context: `https://raw.githubusercontent.com/lcaladoferreira/test/main/llms-full.txt`
- Direct Hire: `https://directhireagents.com/agents/x402-youtube-transcript`
- x402scan registration: `https://github.com/Merit-Systems/x402scan/issues/1100`
