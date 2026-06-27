# Phase 1 Automation Expansion

This update adds the swarm-side foundation for the automation ecosystem requested for FantasyMMAdness.

## Added in this package

- Automation registry with 50+ automation definitions.
- Per-automation enable/disable settings.
- Per-automation mode controls: `DRY_RUN`, `SHADOW`, `DRAFT_ONLY`, `APPROVAL_REQUIRED`, `AUTOMATED`.
- Automation event trigger API.
- Automation dashboard API for the future admin panel.
- Automation logs API.
- Bulk settings update API.
- Expanded job types for content, SEO, social, data, analytics, media, notifications, and operations.
- Worker support for all new job categories.
- Scheduler hook for enabled scheduled automations.

## Important safety model

Phase 1 still does not directly mutate the live website. It creates jobs and artifacts only.

The backend/frontend phases will decide how to apply approved artifacts to:

- blogs
- metadata
- social posts
- sitemaps
- internal links
- homepage features
- notifications
- analytics dashboards

## New internal endpoints

All `/internal/v1/*` endpoints require swarm API key or HMAC auth.

```http
GET    /internal/v1/automations
GET    /internal/v1/automations/dashboard
GET    /internal/v1/automations/logs
GET    /internal/v1/automations/:key
PATCH  /internal/v1/automations/:key/settings
POST   /internal/v1/automations/:key/reset
POST   /internal/v1/automations/settings/bulk
POST   /internal/v1/automations/events
```

## Example: enable fight publish blog automation

```bash
curl -X PATCH "http://SERVER_IP:8080/internal/v1/automations/fight.publish.blogDraft/settings" \
  -H "x-swarm-api-key: YOUR_SWARM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"mode":"APPROVAL_REQUIRED","approvalRequired":true}'
```

## Example: trigger fight published event

```bash
curl -X POST "http://SERVER_IP:8080/internal/v1/automations/events" \
  -H "x-swarm-api-key: YOUR_SWARM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger":"fight.published",
    "vertical":"combat",
    "sourceEntity":{"type":"fight","id":"test-fight-1","label":"Demo Fight"},
    "input":{"topic":"Demo Fight fantasy preview","title":"Demo Fight"},
    "requestedBy":{"source":"developer","role":"admin"}
  }'
```

## Automation phases

Phase 1 has the swarm infrastructure and generated artifacts.
Phase 2 should add backend event hooks and artifact application adapters.
Phase 3 should add admin control screens, toggles, logs, and review UX.
