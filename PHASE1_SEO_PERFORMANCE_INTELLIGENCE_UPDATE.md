# Phase 1 SEO + Performance Intelligence Update

This update expands the swarm as the SEO/content/growth intelligence layer for the 5-phase FantasyMMAdness SEO implementation plan.

## Added swarm capabilities

- Technical SEO foundation audit.
- Sitemap and robots.txt audit plan.
- Pagination opportunity reporting for public and admin-heavy lists.
- Image/media performance audit.
- Core Web Vitals improvement planning.
- Sport landing page roadmap for MMA, Boxing, Kickboxing, Bare-Knuckle, and Pro Wrestling.
- Fight detail SEO page roadmap.
- Fighter/wrestler profile SEO page roadmap.
- Blog architecture audit.
- Footer/internal-link audit.
- Conversion CTA audit.
- Trust/compliance content plan.
- Sport landing page content briefs.
- Fight detail page content briefs.
- Fighter/wrestler profile page content briefs.

## Behavior

The swarm now generates reviewable artifacts that describe what needs to be implemented in backend/frontend. It does not directly modify live SEO, pages, sitemap, robots.txt, or public website content.

## Safety model

- Swarm creates recommendations, drafts, audits, and implementation plans.
- Backend validates and applies approved changes in Phase 2.
- Frontend displays premium public pages and admin review controls in Phases 3-5.

## Daily scheduler expansion

When scheduling is enabled, daily SEO jobs now also create:

- `seo.technical-foundation-audit`
- `seo.sitemap-robots-audit`
- `seo.pagination-opportunity-report`
- `seo.image-performance-audit`

These jobs are idempotent per day.

## New job types

- `seo.technical-foundation-audit`
- `seo.sitemap-robots-audit`
- `seo.pagination-opportunity-report`
- `seo.image-performance-audit`
- `seo.core-web-vitals-plan`
- `seo.landing-page-roadmap`
- `seo.fight-detail-seo-roadmap`
- `seo.fighter-profile-seo-roadmap`
- `seo.blog-architecture-audit`
- `seo.footer-internal-link-audit`
- `seo.conversion-cta-audit`
- `seo.trust-compliance-content-plan`
- `content.sport-landing-page-brief`
- `content.fight-detail-page-brief`
- `content.fighter-profile-page-brief`

## Next phases

Phase 2 backend should add the APIs/storage/apply flows for these artifacts. Phases 3-5 frontend should add premium public pages and admin SEO/growth control screens.
