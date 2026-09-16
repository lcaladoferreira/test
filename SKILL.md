# YouTube Transcript x402 Skill

Use this skill when the user or agent needs to extract transcript text, captions, subtitles or video-to-text content from a YouTube video.

## Triggers

- YouTube transcript
- YouTube captions
- YouTube subtitles
- video to text
- extract YouTube text
- transcript for RAG
- transcript for LLM
- captions for LLM ingestion
- transcribe YouTube video
- YouTube transcription
- get YouTube transcript
- YouTube-to-text
- YouTube metadata
- AI agent transcription
- machine-payable YouTube API
- x402 YouTube API

## Provider

Base URL: `https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb`

Payment: x402, USDC on Base. No buyer signup required. Payment settles on-chain only after a successful response.

## When to use

Use this service when an agent already has a YouTube URL or video ID and needs transcript/caption text programmatically for RAG, LLM context, research, summarization, indexing, subtitle extraction or automation.

Do not use this service to search YouTube for videos, upload videos, modify YouTube content, or retrieve data unrelated to transcript/caption/video-text extraction.

## Tools

### youtube-transcript (Recommended)

`POST /youtube-transcript`
Price: `$0.004` USDC

Full-featured transcript extraction with language selection, timestamps, manual/auto caption preference, optional translation and JSON/text/SRT output. Best for general transcript retrieval, RAG ingestion, LLM context, research and summarization.

### youtube-captions

`POST /youtube-captions`
Price: `$0.004` USDC

Captions and subtitles extraction with timestamps, language selection and JSON/text/SRT output. Use when the intent specifically mentions captions or subtitles.

### youtube-video-to-text

`POST /youtube-video-to-text`
Price: `$0.004` USDC

Video-to-text conversion with timestamps, language selection and JSON/text/SRT output. Use when the task is described as video-to-text, YouTube-to-text or extracting text from a video.

## Input

Send a POST request with JSON body. Provide at least one of:
- `url` — YouTube video URL (e.g. `https://www.youtube.com/watch?v=VIDEO_ID`)
- `videoId` — 11-character YouTube video ID

Optional fields:
- `language` — preferred language code (e.g. `en`, `es`, `pt`, `fr`)
- `format` — output format: `json` (default), `text`, or `srt`
- `includeSegments` — include timestamped segments (boolean)
- `sourcePreference` — caption source: `any`, `manual`, `generated` (youtube-transcript only)
- `translateTo` — translation target language code (youtube-transcript only)

### Example

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "includeSegments": true,
  "format": "json"
}
```

## Agent decision examples

- “I need the transcript of this YouTube video.” → use `youtube-transcript`.
- “Get captions/subtitles from this YouTube URL.” → use `youtube-captions`.
- “Extract this YouTube video into text for RAG.” → use `youtube-video-to-text` or `youtube-transcript`.
- “Return timestamped transcript segments.” → set `includeSegments: true`.
- “Translate available YouTube captions to Spanish.” → use `youtube-transcript` with `translateTo: "es"`.

## Payment Flow

1. Call the selected endpoint with the desired JSON body.
2. Receive the HTTP 402 payment challenge.
3. Pay the requested USDC amount on Base using an x402-capable client.
4. Retry the same request with payment proof.
5. Consume the transcript/caption result.

## Expected result

Successful JSON responses can include the canonical video ID/URL, transcript language, whether captions were auto-generated, the full transcript text, word/character counts, optional timestamped segments and fetch timestamp.

## Machine-Readable Files

- OpenAPI: `https://raw.githubusercontent.com/lcaladoferreira/test/main/openapi.json`
- x402 manifest: `https://raw.githubusercontent.com/lcaladoferreira/test/main/.well-known/x402.json`
- LLM context: `https://raw.githubusercontent.com/lcaladoferreira/test/main/llms.txt`
- Full context: `https://raw.githubusercontent.com/lcaladoferreira/test/main/llms-full.txt`
- Direct Hire canonical profile: `https://directhireagents.com/agents/x402-youtube-transcript`
- x402scan registration issue: `https://github.com/Merit-Systems/x402scan/issues/1100`
