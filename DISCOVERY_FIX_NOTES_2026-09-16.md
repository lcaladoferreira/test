# Discovery monetization fix — 2026-09-16

Purpose: align machine-readable discovery across the seven paid YouTube x402 routes already implemented in the repository.

Key findings:
- Agentic.Market does not require separate registration; it surfaces endpoints indexed through Bazaar discovery.
- Bankr supports agent discovery through `bankr.x402.json` descriptions, tags and schemas.
- The repository already implements `youtube-transcript-basic`, `youtube-transcript`, `youtube-captions`, `youtube-subtitles`, `youtube-video-to-text`, `youtube-metadata`, and `youtube-transcript-batch`.
- Before this fix, machine-readable manifests described only three of those routes.

This branch aligns `bankr.x402.json`, `openapi.json`, `.well-known/x402.json`, and `SKILL.md` so agents receive one consistent catalog.
