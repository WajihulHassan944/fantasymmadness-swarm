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

## Safety boundaries

- No direct writes to the live website collections
- No wallet, payout, entry, prediction, or settlement operations
- No browser-facing swarm secret
- Social output is draft-only
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
