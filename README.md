# x402 YouTube Transcript API — YouTube Data APIs for AI Agents

**Pay per call. No signup or API key.** Machine-payable YouTube transcript, captions, subtitles, metadata, video-to-text and batch APIs for autonomous agents, LLM/RAG pipelines, research and automation.

**Payment:** x402 · **Network:** Base · **Asset:** USDC

## Live Paid Endpoints

Base URL:

```
https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb
```

| API | Price | Endpoint | Best For |
|---|---:|---|---|
| YouTube Transcript Basic | **$0.0011** | `/youtube-transcript-basic` | Cheapest transcript acquisition for agent loops |
| YouTube Transcript | **$0.004** | `/youtube-transcript` | Full transcript workflows and structured output |
| YouTube Captions | **$0.004** | `/youtube-captions` | Captions extraction |
| YouTube Subtitles | **$0.004** | `/youtube-subtitles` | Subtitle-focused extraction |
| YouTube Video to Text | **$0.004** | `/youtube-video-to-text` | Video-to-text workflows |
| YouTube Metadata | **$0.002** | `/youtube-metadata` | Video metadata without full transcript processing |
| YouTube Transcript Batch | **$0.010** | `/youtube-transcript-batch` | Multiple YouTube URLs in one workflow |

## What an AI Agent Can Use This For

- Acquire YouTube text for RAG ingestion
- Add YouTube context to an LLM or research agent
- Extract captions or subtitles
- Retrieve video metadata
- Convert YouTube video content to text
- Process multiple YouTube URLs in batch
- Build summarization, media-intelligence and research pipelines

## Minimal Call

```bash
curl -X POST \
  'https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/youtube-transcript' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

The first unpaid request should return **HTTP 402 Payment Required** with x402 payment requirements. An x402-capable client can authorize the USDC payment on Base and retry the request with payment proof.

## Agent Decision Rules

- Need the **lowest-cost transcript** → `/youtube-transcript-basic`
- Need a **full transcript** → `/youtube-transcript`
- Need **captions** → `/youtube-captions`
- Need **subtitles** → `/youtube-subtitles`
- Need **video-to-text** → `/youtube-video-to-text`
- Need only **video metadata** → `/youtube-metadata`
- Need **multiple videos** → `/youtube-transcript-batch`

## Machine-Readable Discovery

| Resource | URL |
|---|---|
| OpenAPI 3.1 | https://raw.githubusercontent.com/lcaladoferreira/test/main/openapi.json |
| x402 manifest | https://raw.githubusercontent.com/lcaladoferreira/test/main/.well-known/x402.json |
| Bankr x402 metadata | https://raw.githubusercontent.com/lcaladoferreira/test/main/bankr.x402.json |
| Agent Skill | https://raw.githubusercontent.com/lcaladoferreira/test/main/SKILL.md |
| LLM context | https://raw.githubusercontent.com/lcaladoferreira/test/main/llms.txt |
| Full LLM context | https://raw.githubusercontent.com/lcaladoferreira/test/main/llms-full.txt |
| Agent guide | https://raw.githubusercontent.com/lcaladoferreira/test/main/AGENTS.md |

## Public Service Identity

Direct Hire:
https://directhireagents.com/agents/x402-youtube-transcript

x402scan registration thread:
https://github.com/Merit-Systems/x402scan/issues/1100

## Why an Agent Would Choose It

- No buyer account or API key
- Pay only per request
- USDC on Base through x402
- Entry route from $0.0011
- Separate transcript, captions, subtitles, metadata and batch capabilities
- Machine-readable OpenAPI and Agent Skill
- Designed for RAG, LLM context and autonomous workflows

## Search Intent

YouTube transcript API, YouTube captions API, YouTube subtitles API, YouTube metadata API, video to text API, YouTube to text, RAG YouTube, LLM YouTube context, AI agent transcription, media intelligence, research agent tool, machine-payable API, x402 API, autonomous agent tool.
