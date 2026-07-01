# July 10,000 Signup Growth System — Swarm Update

This update adds safe draft/approval-first swarm support for the requested Fantasy MMadness July growth system.

## Safety model

- No live social posting is performed by default.
- No backend, wallet, scoring, user, payout, or prediction data is changed by the swarm.
- All generated content is an artifact for admin/backend review.
- `SWARM_SOCIAL_PUBLISH_ENABLED=false` and `YOUTUBE_UPLOAD_ENABLED=false` are the safe defaults.
- Every social/video visual brief includes a small Fantasy MMadness logo overlay requirement.
- YouTube videos include the required closing CTA: `Make your picks on Fantasy MMadness before the event starts.`

## New campaign pack

`july_10000_signup_growth_system`

This campaign groups the safe daily agents:

- Event Calendar Agent
- Fight Card Agent
- Instagram Agent
- Facebook Agent
- X Agent
- Blog & SEO Agent
- YouTube Growth Agent
- Short Form Video Agent
- Community & Retention Agent
- Branded media prompt helper

## New job types

- `analytics.july-10000-signup-growth-plan`
- `data.event-calendar-daily-update`
- `content.fight-card-daily-package`
- `content.blog-seo-daily-articles`
- `social.instagram-growth-posts`
- `social.facebook-growth-posts`
- `social.x-growth-posts`
- `social.youtube-growth-video-draft`
- `social.short-form-video-pack`
- `notification.community-retention-daily`
- `media.blog-featured-image-prompt`
- `media.branded-post-image-prompt`

## Trigger model

The new automations are disabled by default and can be run by backend/admin through:

- campaign creation using `july_10000_signup_growth_system`
- scheduled daily trigger `schedule.daily`
- manual social/content/media jobs

Backend Phase should decide which artifacts are published and where they are applied.
