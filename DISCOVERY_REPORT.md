# x402 Discovery Audit Report — 2026-09-14

## Executive Summary

**DISCOVERY STATUS: NOT YET RESOLVED — BLOCKER IDENTIFIED**

The 3 active Bankr endpoints (youtube-transcript, youtube-captions, youtube-video-to-text) are deployed and returning HTTP 402, but **do not appear in the Bankr x402 Marketplace search**. The root cause is Bankr's **approval-based indexing** — deployment alone does not guarantee marketplace discoverability. All repository metadata has been optimized in this session to maximize discoverability once approval is granted.

---

## 1. Audit Findings

### Endpoints Status
| Endpoint | HTTP Status | Active | Deployed | Price |
|---|---|---|---|---|
| youtube-transcript | 402 (payment required) | YES | YES | $0.004 |
| youtube-captions | 402 (payment required) | YES | YES | $0.004 |
| youtube-video-to-text | 402 (payment required) | YES | YES | $0.004 |

### Marketplace Discovery Status
| Query | Result |
|---|---|
| youtube transcript | NOT FOUND |
| youtube transcript api | NOT FOUND |
| youtube captions | NOT FOUND |
| youtube subtitles | NOT FOUND |
| youtube transcription | NOT FOUND |
| video transcript | NOT FOUND |
| youtube video to text | NOT FOUND |
| transcribe youtube video | NOT FOUND |

**MARKETPLACE_DISCOVERABLE = NO**

### Root Cause: Bankr Approval-Based Indexing

From Bankr's own documentation and announcements:
- "Approved endpoints are automatically indexed in Bankr's agent discovery layer"
- "Auto-indexed on deploy **(approval required)**"
- "The undisclosed approval criteria for agent discovery indexing introduces centralization risk"

**This means:** Even with perfect metadata, Bankr must manually approve endpoints before they appear in marketplace search. This is a platform-side gate that we cannot bypass.

---

## 2. What Was Fixed (Repository Side)

### bankr.x402.json — CRITICAL CHANGES
- **Reduced from 10 services to 3 active services** (removed 7 un-deployed aliases)
- Added comprehensive `category: "ai"` on all services
- Expanded `tags` to 20-23 per service covering all search intents
- Enhanced `description` fields with intent-oriented language for agents
- Added `required` fields in input schemas where applicable
- Added `enum` values for `format` and `sourcePreference`
- Fixed `description` on all schema properties
- Ensured output schemas match actual handler return values

### .well-known/x402.json
- Added `description` per service
- Expanded `keywords` with comprehensive search terms
- Added `openapi` link to OpenAPI spec

### .well-known/agent.json — NEW
- A2A Agent Card for decentralized discovery
- References all 3 active capabilities with pricing and endpoints

### openapi.json — MAJOR FIXES
- Fixed field names to match actual handlers (`url`, `videoId` not `video_id`, `ref`)
- Split request schemas: `TranscriptRequest` (youtube-transcript with sourcePreference/translateTo) vs `CaptionsRequest` (youtube-captions/youtube-video-to-text)
- Added all response fields from actual handler output
- Added `x-payment-info` metadata on each endpoint
- Added all HTTP status codes (402, 405, 422)

### All Discovery Files Updated
- **AGENTS.md** — comprehensive agent guide with decision rules, payment flow, discovery links
- **llms.txt** — enhanced with all search intents
- **llms-full.txt** — NEW — full context file with complete API docs
- **mcp-actions.json** — updated with accurate schemas and descriptions
- **agent-permissions.json** — added `intents` array per capability
- **SKILL.md** — updated with full trigger list and input docs
- **README.md** — added "For AI Agents — Machine Discovery" section
- **index.html** — aligned to 3 active services
- **docs/index.html** — aligned to 3 active services
- **docs/llms.txt** — aligned to 3 active services
- **docs/api-catalog.json** — aligned to 3 active services

### GitHub Actions Workflows — UPDATED
- **deploy-bankr-x402.yml** — focused on 3 active services
- **x402-smoke.yml** — comprehensive validation + discovery verification with explicit FOUND_OUR_SERVICE=YES/NO per query
- **bankr-revenue-check.yml** — discovery check + revenue monitoring
- **bankr-live-schema.yml** — schema and HTTP probe for 3 active services
- **x402-market-watch.yml** — marketplace discovery monitoring
- **register-402index.yml** — focused on 3 active services
- **register-x402-list.yml** — focused on 3 active services

---

## 3. External Blockers

### Bankr x402 Marketplace (PRIMARY)
- **Status:** ACTIVE endpoints, NOT discoverable
- **Blocker:** Bankr approval-based indexing
- **Action needed:** Run `bankr x402 deploy` with updated metadata to trigger re-indexing request
- **Requires:** `BANKR_API_KEY` secret (not available in this environment)
- **Cannot bypass:** Approval is Bankr-managed and opaque

### Coinbase x402 Bazaar
- **Status:** NOT indexed (Bankr uses its own facilitator, not CDP facilitator)
- **Blocker:** Bazaar only auto-catalogs services that settle through the Coinbase CDP facilitator
- **Action needed:** Either register manually or implement Bazaar discovery extension
- **Note:** Bankr x402 Cloud endpoints use Bankr's own facilitator

### Free Directories (Already Registered)
- 402 Index (402index.io) — workflow exists, registers 3 endpoints
- Agent402 — workflow exists
- x402-list.com — workflow exists

### Paid Directories (Skipped per instructions)
- Signal402 ($0.01 registration fee)

---

## 4. What Needs to Happen Next

### Step 1: Run Deploy (REQUIRES BANKR_API_KEY)
```bash
# Merge arena/01a0a22f-test to main
# Ensure BANKR_API_KEY is set as a GitHub secret
# Push to main triggers deploy-bankr-x402.yml
git checkout main
git merge arena/01a0a22f-test
git push origin main
```

### Step 2: Verify Deploy Succeeded
```bash
# Check all endpoints return 402
curl -X POST https://x402.bankr.bot/0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb/youtube-transcript \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
# Should return HTTP 402
```

### Step 3: Verify Discovery (AFTER DEPLOY)
```bash
npx @bankr/cli x402 search "youtube transcript" --raw
# Check if our wallet appears in results
```

### Step 4: If Still Not Discoverable
Contact Bankr support or ask via chat:
```
"Please approve my x402 endpoints for marketplace discovery.
 My wallet is 0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb.
 Services: youtube-transcript, youtube-captions, youtube-video-to-text.
 All endpoints are active and returning HTTP 402."
```

### Step 5: Register on Coinbase Bazaar (OPTIONAL)
If Bankr doesn't index, consider registering directly on Coinbase's discovery:
- https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources
- Requires CDP facilitator settlement or manual registration

---

## 5. Criteria Status

| Criterion | Status |
|---|---|
| Endpoints active | YES |
| HTTP 402 verified | YES |
| Metadata optimized | YES |
| bankr.x402.json correct | YES (3 active services) |
| OpenAPI accurate | YES |
| All discovery files consistent | YES |
| Workflows updated | YES |
| Marketplace searchable | NO (Bankr approval pending) |
| Evidence of search result | NONE |

**VERDICT: DISCOVERY AINDA NÃO RESOLVIDO**

All repository-side fixes are complete. The remaining blocker is Bankr's approval-based indexing, which requires running `bankr x402 deploy` with the updated metadata and waiting for/asking for Bankr approval.

---

## 6. File Inventory

All files committed and pushed to `arena/01a0a22f-test`:
- Commit: `6b0b99d fix: optimize x402 discovery for Bankr marketplace and agent search`
- 22 files changed, 1206 insertions(+), 331 deletions(-)
- 2 new files: `.well-known/agent.json`, `llms-full.txt`
