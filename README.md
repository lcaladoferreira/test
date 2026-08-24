# YouTube Transcript x402

Paid machine-consumable YouTube transcript endpoint for AI agents, RAG pipelines and automation.

## Offer

- Input: YouTube URL or video ID
- Output: clean transcript, word count, metadata
- Optional timestamped segments
- Target price: **$0.004/request**
- Failed transcript fetches return an error response

The target price is intentionally below the common $0.005/transcript price currently seen on leading Apify transcript Actors.

## Request

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "language": "en",
  "includeSegments": true
}
```

## Bankr x402 Cloud

The service is structured for `bankr x402 deploy`. Bankr provides hosting, x402 billing, agent discovery and USDC settlement.
