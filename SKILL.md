# YouTube Transcript x402 Skill

Use this skill when the user or agent needs to extract text, transcript, captions, subtitles, or RAG-ready content from a YouTube video.

## Triggers

- YouTube transcript
- YouTube captions
- YouTube subtitles
- video to text
- extract YouTube text
- transcript for RAG
- captions for LLM ingestion

## Provider

Base URL: `https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb`

Payment: x402, USDC on Base. No buyer signup required.

## Tools

### youtube-transcript

POST `/youtube-transcript`

Price: `$0.004` USDC

Use for transcript extraction with language selection, timestamps and text/JSON/SRT output where available.

### youtube-captions

POST `/youtube-captions`

Price: `$0.004` USDC

Use when the intent specifically mentions captions or subtitles.

### youtube-video-to-text

POST `/youtube-video-to-text`

Price: `$0.004` USDC

Use for extracting text from available YouTube captions for search, summarization and RAG. Do not interpret this alias as guaranteed Whisper transcription when the source has no captions.

## Input

Provide one of `url`, `video_id`, or `ref`. Optional fields include `language`, `language_code`, `timestamps`, and `format` (`json`, `text`, or `srt`).

Example:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "timestamps": true,
  "format": "json"
}
```

## Payment flow

1. Call the selected endpoint.
2. Receive the HTTP 402 payment challenge.
3. Pay the requested USDC amount on Base using an x402-capable client.
4. Retry with payment proof.
5. Consume the transcript/caption result.

Machine-readable OpenAPI: `https://raw.githubusercontent.com/lcaladoferreira/test/main/openapi.json`

x402 manifest: `https://raw.githubusercontent.com/lcaladoferreira/test/main/.well-known/x402.json`
