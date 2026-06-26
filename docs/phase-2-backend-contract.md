# Phase 2 Backend Contract

The Vercel Express backend should integrate with this swarm through server-to-server calls.

## Create job

```http
POST /internal/v1/jobs
```

Example body:

```json
{
  "vertical": "combat",
  "jobType": "content.article",
  "mode": "DRAFT_ONLY",
  "priority": 50,
  "idempotencyKey": "backend:blog:combat:123",
  "requestedBy": {
    "id": "admin-id",
    "email": "admin@example.com",
    "role": "admin",
    "source": "backend"
  },
  "input": {
    "topic": "UFC fantasy preview",
    "keywords": ["MMA fantasy", "FantasyMMAdness"]
  },
  "backendCorrelationId": "backend-record-or-request-id"
}
```

## Artifact mapping to current backend

### Blog-compatible content artifacts

Swarm payload fields map to the existing backend Blog schema:

```text
payload.metaTitle        -> Blog.metaTitle
payload.metaDescription  -> Blog.metaDescription
payload.header           -> Blog.header
payload.sections[]       -> Blog.sections[]
```

### Pro-wrestling scorecard artifacts

Scorecard suggestions are advisory only:

```text
payload.competitorA.HP/BP/K/PM/FM
payload.competitorB.HP/BP/K/PM/FM
payload.winnerPrediction
```

The existing backend still validates official predictions and scores.

## Recommended backend flags

```text
SWARM_ENABLED=true
SWARM_AUTO_PUBLISH_ENABLED=false
SWARM_AUTO_IMPORT_ENABLED=false
SWARM_SOCIAL_PUBLISH_ENABLED=false
```
