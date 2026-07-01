# FantasyMMAdness Centralized Swarm — Phase 1

Standalone Node.js/TypeScript swarm runtime for FantasyMMAdness automation.

This repository is intentionally separate from the production Next.js frontend and Vercel Express backend. It runs the long-lived automation layer on IONOS and produces draft artifacts for later backend/frontend approval workflows.

## What is included

- Centralized MMA/combat + pro-wrestling swarm runtime
- Express internal API
- MongoDB-backed job queue using atomic leases
- Persistent worker process
- Optional scheduler
- Content draft agent
- SEO audit agent
- Social draft agent
- External data candidate agent
- Pro-wrestling scorecard, analysis, and profile agents
- HMAC/API-key server-to-server auth
- Artifact review status model
- Docker Compose deployment files
- Automation registry and settings API
- Automation event trigger API
- Admin-dashboard-ready automation logs and controls
- Expanded job types for blogs, SEO, social, media, analytics, notifications, and content planning

## Safety boundaries

- No direct writes to the live website collections
- No wallet, payout, entry, prediction, or settlement operations
- No browser-facing swarm secret
- Social output is draft/approval-first by default
- Backend remains the official source for publishing and scoring in Phase 2

## Main commands

```bash
npm install
npm run build
npm test
npm run start:api
npm run start:worker
```

## Core endpoints

```http
GET  /health
GET  /readiness
GET  /internal/v1/agents
POST /internal/v1/jobs
GET  /internal/v1/jobs
GET  /internal/v1/jobs/:jobId
POST /internal/v1/jobs/:jobId/cancel
POST /internal/v1/jobs/:jobId/retry
GET  /internal/v1/artifacts
GET  /internal/v1/artifacts/:artifactId
POST /internal/v1/artifacts/:artifactId/review
GET  /internal/v1/automations
GET  /internal/v1/automations/dashboard
GET  /internal/v1/automations/logs
PATCH /internal/v1/automations/:key/settings
POST /internal/v1/automations/events
```

`/internal/v1/*` requires `x-swarm-api-key` or signed HMAC headers.

## Minimal IONOS deployment

```bash
git clone <your-github-repo-url>
cd fantasymmadness-centralized-swarm
cp .env.example .env
npm run secret
# put generated secrets and MongoDB URI into .env

docker compose up -d --build
```

Check:

```bash
curl http://SERVER_IP:8080/health
```

Create a smoke-test job:

```bash
SWARM_URL=http://SERVER_IP:8080 \
SWARM_API_KEY=your-api-key \
npm run create:job
```

Then inspect:

```bash
docker compose logs -f swarm-worker
```

## Phase 2 connection point

The Vercel backend should call only `/internal/v1/jobs` and `/internal/v1/artifacts/*` using HMAC or the API key. The frontend should never call this service directly.


## Automation expansion

This package includes the Phase 1 swarm-side foundation for the requested traffic-growth ecosystem:

- fight/match publish automations
- result recap automations
- blog/social/newsletter automations
- SEO metadata, schema, sitemap, internal-linking, and audit automations
- fighter/wrestler profile content automations
- content calendar and topic suggestion automations
- admin settings, logs, dashboard, failed-job retry, and notification automations

See `PHASE1_AUTOMATION_EXPANSION.md` for event examples.


## Campaign / All Agents API

The swarm now supports grouped campaigns for the admin UI. Backend Phase 2 can call:

```http
GET  /internal/v1/campaigns/packs
POST /internal/v1/campaigns
GET  /internal/v1/campaigns
GET  /internal/v1/campaigns/:campaignId
```

Recommended campaign types:

- `fight_full_campaign`
- `fight_tonight_campaign`
- `boxing_fight_campaign`
- `fight_result_campaign`
- `pro_wrestling_match_campaign`
- `blog_promotion_campaign`
- `contest_promotion_campaign`

Use `includeAll: true` for the client-facing “All Agents / All the Above” button. For Boxing, keep `vertical: "combat"` and pass `sport: "boxing"`.

SEO artifacts now include an `applicationPlan`. The swarm generates the SEO package; backend/frontend approval applies it to live pages.

## July 10,000 Signup Growth System

This package now includes a safe draft/approval-first growth campaign pack:

```http
POST /internal/v1/campaigns
```

Use `campaignType: "july_10000_signup_growth_system"` to create grouped draft artifacts for:

- Event Calendar Agent
- Fight Card Agent
- Instagram Agent
- Facebook Agent
- X Agent
- Blog & SEO Agent
- YouTube Growth Agent
- Short Form Video Agent
- Community & Retention Agent

The swarm does not publish directly by default. Keep these safe defaults until backend/admin approval flow is implemented:

```env
SWARM_SOCIAL_PUBLISH_ENABLED=false
YOUTUBE_UPLOAD_ENABLED=false
SWARM_AUTO_PUBLISH_ENABLED=false
SWARM_AUTO_IMPORT_ENABLED=false
```

Every generated social/video visual brief requires a small Fantasy MMadness logo overlay. Set `BRAND_LOGO_URL` in `.env` before generating final artwork.

Every YouTube video draft ends with:

```text
Make your picks on Fantasy MMadness before the event starts.
```
