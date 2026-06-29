# Phase 1 Daily SEO / Social / Calendar Swarm Update

This phase updates only the IONOS swarm service. Backend and frontend wiring can use these new jobs and settings in the next phases.

## Added

- Daily SEO automation job creation when the scheduler is enabled.
- Daily fight calendar refresh planning for public calendar, upcoming fights, homepage, and user dashboard modules.
- Daily user dashboard fight-opportunity planning.
- Multiple daily social draft generation for X, Instagram, and Facebook.
- Instagram and Facebook credential/readiness checks.
- New 1000-user growth-plan automation artifact.
- Social platform readiness metadata showing which credentials are missing per platform.

## New scheduler env controls

```env
SCHEDULER_ENABLED=false
SCHEDULED_DAILY_SEO_ENABLED=true
SCHEDULED_FIGHT_CALENDAR_ENABLED=true
SCHEDULED_DAILY_SOCIAL_ENABLED=true
SCHEDULED_DAILY_CONTENT_ENABLED=true
SCHEDULED_SOCIAL_DRAFTS_PER_DAY=3
SCHEDULED_GROWTH_PLAN_ENABLED=true
SOCIAL_DEFAULT_PLATFORMS=x,instagram,facebook
```

Keep `SCHEDULER_ENABLED=false` until backend and frontend review controls are ready. After testing, enable it on IONOS.

## New Meta/Facebook/Instagram env placeholders

```env
META_GRAPH_API_VERSION=v21.0
META_APP_ID=
META_APP_SECRET=
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_ACCESS_TOKEN=
```

Phase 1 generates drafts and readiness checks. Backend/admin approval should control real live posting.
