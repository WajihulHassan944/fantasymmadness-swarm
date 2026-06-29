import type { ArtifactType } from '../contracts/artifacts.js';
import type { JobType } from '../contracts/job.js';
import type { SwarmJobDocument } from '../models/job.model.js';
import { getAiProvider } from '../providers/ai/index.js';
import type { AgentExecutionResult, SwarmAgent } from './base.js';
import { getString, getStringArray } from './base.js';

interface SeoAuditPayload extends Record<string, unknown> {
  targetUrl?: string;
  targetKeyword: string;
  metaTitle: string;
  metaDescription: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
  }>;
  schemaMarkup: Record<string, unknown>;
  internalLinkSuggestions: Array<{ anchor: string; targetPath: string; reason: string }>;
  contentBrief: string[];
  pageInventorySummary: {
    suppliedPageCount: number;
    priorityPageTypes: string[];
    emptyOrThinPagePolicy: string;
    noIndexCandidates: string[];
  };
  technicalSeoRoadmap: Array<{
    area: string;
    priority: 'low' | 'medium' | 'high';
    frontendNeeded: boolean;
    backendNeeded: boolean;
    swarmNeeded: boolean;
    recommendation: string;
  }>;
  paginationRecommendations: Array<{
    collection: string;
    preferredStrategy: 'offset' | 'cursor' | 'hybrid';
    recommendedParams: string[];
    reason: string;
  }>;
  performanceRecommendations: Array<{
    metric: 'LCP' | 'INP' | 'CLS' | 'bundle' | 'images' | 'api-cache';
    recommendation: string;
    implementationOwner: 'frontend' | 'backend' | 'swarm';
  }>;
  structuredDataPlan: Array<{
    pageType: string;
    schemaTypes: string[];
    notes: string;
  }>;
  growthOpportunities: Array<{
    opportunity: string;
    targetPageOrFeature: string;
    expectedImpact: 'low' | 'medium' | 'high';
    followUpJobTypes: string[];
  }>;
  nextPhaseImplementationPlan: {
    backendRequirements: string[];
    frontendRequirements: string[];
    swarmRequirements: string[];
    acceptanceChecks: string[];
  };
  applicationPlan: {
    managedBySwarm: boolean;
    requiresBackendApply: boolean;
    safeToAutoApply: boolean;
    targetFields: string[];
    backendAction: string;
    notes: string[];
  };
}

export class SeoAgent implements SwarmAgent {
  readonly name = 'seo-agent';
  readonly version = '1.4.0';

  supports(jobType: JobType): boolean {
    return jobType.startsWith('seo.');
  }

  async run(job: SwarmJobDocument): Promise<AgentExecutionResult> {
    const input = job.input || {};
    const targetUrl = getString(input, 'targetUrl');
    const sport = getString(input, 'sport', getString(input, 'discipline', job.vertical === 'pro_wrestling' ? 'pro_wrestling' : 'mma'));
    const targetKeyword = getString(input, 'targetKeyword', this.defaultKeyword(job, sport));
    const pageTitle = getString(input, 'pageTitle', getString(input, 'title', 'FantasyMMAdness'));
    const secondaryKeywords = getStringArray(input, 'secondaryKeywords');
    const pageInventory = this.extractPageInventory(input);

    const fallback: SeoAuditPayload = {
      targetUrl: targetUrl || undefined,
      targetKeyword,
      metaTitle: this.defaultMetaTitle(job.jobType, pageTitle, targetKeyword),
      metaDescription: this.defaultMetaDescription(job.jobType, targetKeyword),
      checks: this.defaultChecks(job.jobType),
      schemaMarkup: this.defaultSchema(job, pageTitle, targetKeyword),
      internalLinkSuggestions: this.defaultInternalLinks(job, sport),
      contentBrief: [
        `Introduce the user intent behind ${targetKeyword}.`,
        'Explain how the FantasyMMAdness experience works without changing official website rules.',
        'Link the user toward active fights, fight calendar, how-to-play content, and related blogs.',
        ...secondaryKeywords.map((keyword) => `Naturally include secondary keyword: ${keyword}`),
      ],
      pageInventorySummary: this.pageInventorySummary(job.jobType, pageInventory),
      technicalSeoRoadmap: this.technicalRoadmap(job.jobType),
      paginationRecommendations: this.paginationRecommendations(job.jobType),
      performanceRecommendations: this.performanceRecommendations(job.jobType),
      structuredDataPlan: this.structuredDataPlan(job.jobType, job.vertical),
      growthOpportunities: this.growthOpportunities(job.jobType, sport),
      nextPhaseImplementationPlan: this.nextPhaseImplementationPlan(job.jobType),
      applicationPlan: this.applicationPlanFor(job.jobType),
    };

    const ai = getAiProvider();
    const aiResult = await ai.generateJson<SeoAuditPayload>({
      system: 'You are a technical SEO and growth strategist for FantasyMMAdness. Produce concise JSON only. Do not claim live rankings, traffic numbers, odds, results, or event facts unless included in input. Create operational recommendations that backend/admin can apply safely. Keep recommendations aligned with a premium fantasy fight website with MMA, Boxing, and Pro Wrestling experiences.',
      user: JSON.stringify({
        targetUrl,
        targetKeyword,
        pageTitle,
        secondaryKeywords,
        vertical: job.vertical,
        jobType: job.jobType,
        automationKey: input.automationKey,
        targetOutput: input.targetOutput,
        suppliedPageInventory: pageInventory,
        suppliedEntity: job.sourceEntity,
        sport,
        requestedFocus: this.focusFor(job.jobType),
      }),
      schemaName: 'SeoAuditPayload',
      fallback,
      temperature: 0.2,
    });

    const output = {
      ...fallback,
      ...aiResult.output,
      applicationPlan: aiResult.output.applicationPlan || fallback.applicationPlan,
      nextPhaseImplementationPlan: aiResult.output.nextPhaseImplementationPlan || fallback.nextPhaseImplementationPlan,
    };

    return {
      artifact: {
        jobId: job.jobId,
        vertical: job.vertical,
        jobType: job.jobType,
        artifactType: this.artifactTypeFor(job.jobType),
        title: `${this.titlePrefix(job.jobType)}: ${targetKeyword}`,
        summary: output.metaDescription,
        reviewStatus: 'AWAITING_REVIEW',
        payload: output,
        provenance: {
          provider: aiResult.provider,
          model: aiResult.model,
          promptVersion: 'seo-v4',
          agentVersion: this.version,
          generatedAt: new Date(),
          sources: [],
        },
        quality: { score: aiResult.warnings.length ? 76 : 90, warnings: aiResult.warnings },
        metadata: {
          mode: job.mode,
          automationKey: input.automationKey,
          seoManagedBySwarm: true,
          seoAppliedDirectly: false,
          requiresBackendApply: true,
          sport,
          focus: this.focusFor(job.jobType),
          phase: 'phase-1-swarm-intelligence',
        },
      },
      tokenUsage: aiResult.tokenUsage,
      warnings: aiResult.warnings,
    };
  }

  private artifactTypeFor(jobType: JobType): ArtifactType {
    if (jobType === 'seo.metadata' || jobType === 'seo.opengraph-twitter-cards' || jobType === 'seo.fighter-refresh') return 'seo.metadata-package';
    if (jobType === 'seo.schema-markup' || jobType === 'seo.fight-event-structured-data' || jobType === 'seo.fighter-wrestler-structured-data') return 'seo.schema-markup';
    if (jobType === 'seo.sitemap-refresh' || jobType === 'seo.sitemap-robots-audit') return 'seo.sitemap-refresh-plan';
    if (jobType === 'seo.internal-links' || jobType === 'seo.related-post-linking' || jobType === 'seo.footer-internal-link-audit') return 'seo.internal-link-plan';
    if (jobType === 'seo.keyword-opportunity' || jobType === 'seo.landing-page-roadmap' || jobType === 'seo.fight-detail-seo-roadmap' || jobType === 'seo.fighter-profile-seo-roadmap') return 'seo.keyword-opportunity-report';
    if (jobType.includes('performance') || jobType.includes('vitals') || jobType.includes('pagination') || jobType.includes('technical') || jobType.includes('canonical') || jobType.includes('missing') || jobType.includes('broken') || jobType.includes('duplicate')) return 'seo.technical-issue-report';
    return 'seo.audit-report';
  }

  private defaultKeyword(job: SwarmJobDocument, sport = 'mma'): string {
    if (sport === 'boxing') return 'boxing fantasy fight predictions';
    if (sport === 'kickboxing') return 'kickboxing fantasy fight predictions';
    if (job.jobType.includes('wrestler') || job.vertical === 'pro_wrestling') return 'pro wrestling fantasy predictions';
    if (job.jobType.includes('fighter')) return 'mma fighter fantasy profile';
    if (job.jobType.includes('event')) return 'mma fantasy event preview';
    if (job.jobType.includes('landing')) return 'fantasy combat sports contests';
    if (job.jobType.includes('pagination')) return 'fantasy fight listings';
    return 'mma fantasy predictions';
  }

  private titlePrefix(jobType: JobType): string {
    if (jobType.includes('schema')) return 'Schema package';
    if (jobType.includes('sitemap') || jobType.includes('robots')) return 'Sitemap and robots plan';
    if (jobType.includes('link') || jobType.includes('footer')) return 'Internal link plan';
    if (jobType.includes('keyword')) return 'Keyword opportunities';
    if (jobType.includes('vitals') || jobType.includes('performance') || jobType.includes('image')) return 'Performance SEO plan';
    if (jobType.includes('pagination')) return 'Pagination SEO plan';
    if (jobType.includes('landing') || jobType.includes('detail') || jobType.includes('profile')) return 'SEO page roadmap';
    if (jobType.includes('trust') || jobType.includes('conversion')) return 'Trust and conversion plan';
    if (jobType.includes('blog-architecture')) return 'Blog architecture audit';
    if (jobType.includes('missing') || jobType.includes('broken') || jobType.includes('duplicate') || jobType.includes('canonical')) return 'SEO issue report';
    return 'SEO audit';
  }

  private focusFor(jobType: JobType): string {
    if (jobType.includes('sitemap') || jobType.includes('robots')) return 'sitemap_robots_crawl_control';
    if (jobType.includes('pagination')) return 'pagination_and_data_loading';
    if (jobType.includes('image') || jobType.includes('performance') || jobType.includes('vitals')) return 'performance_core_web_vitals';
    if (jobType.includes('landing')) return 'sport_landing_pages';
    if (jobType.includes('fight-detail')) return 'fight_detail_seo_pages';
    if (jobType.includes('fighter-profile')) return 'fighter_wrestler_profile_pages';
    if (jobType.includes('blog-architecture')) return 'blog_architecture';
    if (jobType.includes('footer') || jobType.includes('internal')) return 'internal_linking';
    if (jobType.includes('conversion')) return 'conversion_cta_paths';
    if (jobType.includes('trust')) return 'trust_compliance_content';
    if (jobType.includes('technical-foundation')) return 'technical_seo_foundation';
    return 'general_seo_growth';
  }

  private defaultMetaTitle(jobType: JobType, pageTitle: string, targetKeyword: string): string {
    if (jobType.includes('landing')) return `${pageTitle} SEO Landing Page Roadmap | FantasyMMAdness`;
    if (jobType.includes('performance') || jobType.includes('vitals')) return `Performance SEO Plan | FantasyMMAdness`;
    return `${pageTitle} | ${targetKeyword} | FantasyMMAdness`;
  }

  private defaultMetaDescription(jobType: JobType, targetKeyword: string): string {
    if (jobType.includes('pagination')) return 'Pagination and data-loading recommendations for faster, crawlable FantasyMMAdness fight, blog, fighter, wrestler, video, and leaderboard pages.';
    if (jobType.includes('sitemap') || jobType.includes('robots')) return 'Sitemap, robots.txt, canonical, and crawl-control recommendations for FantasyMMAdness public SEO pages.';
    if (jobType.includes('performance') || jobType.includes('vitals') || jobType.includes('image')) return 'Performance recommendations for improving public page speed, image delivery, layout stability, and user experience.';
    return `Improve FantasyMMAdness visibility for ${targetKeyword} with stronger metadata, structured content, schema, internal links, and growth-focused content opportunities.`;
  }

  private defaultChecks(jobType: JobType): SeoAuditPayload['checks'] {
    const checks: SeoAuditPayload['checks'] = [
      {
        name: 'Metadata alignment',
        status: 'warning',
        severity: 'medium',
        message: 'Metadata should include primary fantasy intent, sport, and page context.',
        recommendation: 'Use unique titles and benefit-focused descriptions for homepage, fights, blogs, fighters, wrestlers, and sport landing pages.',
      },
      {
        name: 'Structured data readiness',
        status: 'warning',
        severity: 'medium',
        message: 'Schema should be prepared per page type and applied only after verified source fields exist.',
        recommendation: 'Use Organization, WebSite, SportsEvent, Article, BreadcrumbList, FAQPage, VideoObject, and Person/ProfilePage where appropriate.',
      },
      {
        name: 'Internal linking',
        status: 'warning',
        severity: 'medium',
        message: 'Fresh fight, fighter, wrestler, and blog pages need meaningful internal links.',
        recommendation: 'Connect fights to fighter profiles, blogs to active fights, sport landing pages to guides, and profile pages to historical content.',
      },
    ];

    if (jobType.includes('pagination')) {
      checks.push({
        name: 'List scalability',
        status: 'fail',
        severity: 'high',
        message: 'Large public lists should not load unbounded data.',
        recommendation: 'Add backend pagination and frontend pagination UX for fights, blogs, fighters, wrestlers, leaderboards, and videos.',
      });
    }
    if (jobType.includes('performance') || jobType.includes('image') || jobType.includes('vitals')) {
      checks.push({
        name: 'Core Web Vitals readiness',
        status: 'warning',
        severity: 'high',
        message: 'Hero media, fight cards, and heavy below-the-fold sections can affect LCP, INP, and CLS.',
        recommendation: 'Optimize hero media, reserve image dimensions, lazy-load lower sections, split admin bundles, and cache public API data.',
      });
    }
    return checks;
  }

  private pageInventorySummary(jobType: JobType, pageInventory: Record<string, unknown>[]): SeoAuditPayload['pageInventorySummary'] {
    return {
      suppliedPageCount: pageInventory.length,
      priorityPageTypes: ['homepage', 'fight detail pages', 'fighter profiles', 'wrestler profiles', 'sport landing pages', 'blogs', 'guides', 'leaderboards'],
      emptyOrThinPagePolicy: 'Pages with no active data should show evergreen helpful content or be marked noindex until useful content exists.',
      noIndexCandidates: ['admin routes', 'user dashboard/private routes', 'empty search states', 'thin temporary/test pages'],
    };
  }

  private technicalRoadmap(jobType: JobType): SeoAuditPayload['technicalSeoRoadmap'] {
    return [
      { area: 'Dynamic metadata and canonical URLs', priority: 'high', frontendNeeded: true, backendNeeded: true, swarmNeeded: true, recommendation: 'Store/apply unique metadata per public page and generate suggestions via swarm.' },
      { area: 'XML sitemap and robots.txt', priority: 'high', frontendNeeded: true, backendNeeded: true, swarmNeeded: true, recommendation: 'Generate sitemap indexes for static pages, fights, blogs, fighters, wrestlers, videos, and guides; block private/admin routes.' },
      { area: 'Schema markup', priority: 'high', frontendNeeded: true, backendNeeded: true, swarmNeeded: true, recommendation: 'Prepare page-type-specific JSON-LD packages and apply only after backend validates required fields.' },
      { area: 'Pagination and crawlable lists', priority: jobType.includes('pagination') ? 'high' : 'medium', frontendNeeded: true, backendNeeded: true, swarmNeeded: false, recommendation: 'Implement page/cursor APIs and user-friendly listing controls for large datasets.' },
      { area: 'Performance and image delivery', priority: jobType.includes('performance') || jobType.includes('image') ? 'high' : 'medium', frontendNeeded: true, backendNeeded: false, swarmNeeded: true, recommendation: 'Optimize images, reduce public bundle weight, lazy-load heavy sections, and track improvement opportunities.' },
    ];
  }

  private paginationRecommendations(jobType: JobType): SeoAuditPayload['paginationRecommendations'] {
    return [
      { collection: 'upcoming fights / active fights / completed fights', preferredStrategy: 'offset', recommendedParams: ['page', 'limit', 'sport', 'status', 'sortBy', 'sortOrder'], reason: 'Public fight pages need crawlable, user-friendly pagination and freshness sorting.' },
      { collection: 'blogs and news', preferredStrategy: 'offset', recommendedParams: ['page', 'limit', 'category', 'tag', 'search'], reason: 'Blog archives should not load all content and need category SEO pages.' },
      { collection: 'fighters and wrestlers', preferredStrategy: 'offset', recommendedParams: ['page', 'limit', 'sport', 'search', 'sortBy'], reason: 'Profile directories can generate long-tail SEO value with search and pagination.' },
      { collection: 'leaderboards, notifications, swarm jobs, logs', preferredStrategy: 'cursor', recommendedParams: ['cursor', 'limit', 'status', 'type'], reason: 'Fast-changing feeds work better with cursor pagination.' },
      { collection: 'videos / fight media', preferredStrategy: 'hybrid', recommendedParams: ['page', 'limit', 'sport', 'eventId', 'lazy'], reason: 'Video-heavy pages need limited initial payloads and lazy-loaded media.' },
    ];
  }

  private performanceRecommendations(jobType: JobType): SeoAuditPayload['performanceRecommendations'] {
    return [
      { metric: 'LCP', recommendation: 'Preload only the main hero image/video poster and keep the first meaningful fight CTA visible quickly.', implementationOwner: 'frontend' },
      { metric: 'INP', recommendation: 'Avoid loading admin/swarm dashboards, charts, and heavy animation code into public page bundles.', implementationOwner: 'frontend' },
      { metric: 'CLS', recommendation: 'Reserve dimensions for fight, fighter, wrestler, blog, and video thumbnails before images load.', implementationOwner: 'frontend' },
      { metric: 'images', recommendation: 'Serve responsive WebP/AVIF assets where possible and use descriptive alt text tied to fight/fighter context.', implementationOwner: 'frontend' },
      { metric: 'api-cache', recommendation: 'Cache public fights, blogs, profile lists, and homepage data with short freshness windows.', implementationOwner: 'backend' },
      { metric: 'bundle', recommendation: 'Code-split public pages from admin automation and charting dependencies.', implementationOwner: 'frontend' },
    ];
  }

  private structuredDataPlan(jobType: JobType, vertical: string): SeoAuditPayload['structuredDataPlan'] {
    return [
      { pageType: 'Homepage', schemaTypes: ['Organization', 'WebSite'], notes: 'Use consistent brand identity, search action if supported, and social profiles after verification.' },
      { pageType: 'Fight detail', schemaTypes: ['SportsEvent', 'BreadcrumbList', 'FAQPage'], notes: 'Apply only when fight name, competitors, date/time, sport, and status are known.' },
      { pageType: vertical === 'pro_wrestling' ? 'Wrestler profile' : 'Fighter profile', schemaTypes: ['Person', 'BreadcrumbList'], notes: 'Use verified profile stats, related matches, and content links.' },
      { pageType: 'Blog article', schemaTypes: ['Article', 'BreadcrumbList'], notes: 'Include headline, description, published/modified dates, image, and internal links.' },
      { pageType: 'Guides / how to play', schemaTypes: ['FAQPage', 'HowTo', 'BreadcrumbList'], notes: 'Use FAQPage only for real question-answer sections visible on-page.' },
    ];
  }

  private growthOpportunities(jobType: JobType, sport: string): SeoAuditPayload['growthOpportunities'] {
    return [
      { opportunity: 'Create sport-specific landing pages', targetPageOrFeature: 'Fantasy MMA, Boxing, Kickboxing, Bare-Knuckle, Pro Wrestling landing pages', expectedImpact: 'high', followUpJobTypes: ['content.sport-landing-page-brief', 'seo.landing-page-roadmap'] },
      { opportunity: 'Create crawlable fight detail pages', targetPageOrFeature: 'Individual fight/event pages', expectedImpact: 'high', followUpJobTypes: ['content.fight-detail-page-brief', 'seo.fight-detail-seo-roadmap'] },
      { opportunity: 'Create fighter/wrestler profile pages', targetPageOrFeature: 'Profile directories and individual profile pages', expectedImpact: 'high', followUpJobTypes: ['content.fighter-profile-page-brief', 'seo.fighter-profile-seo-roadmap'] },
      { opportunity: 'Refresh old blogs and add internal links', targetPageOrFeature: 'Blog archive and related posts', expectedImpact: 'medium', followUpJobTypes: ['content.old-blog-refresh', 'seo.related-post-linking'] },
      { opportunity: `Publish recurring ${sport} content campaigns`, targetPageOrFeature: 'Blogs, social drafts, newsletter drafts, and homepage/user-dashboard opportunities', expectedImpact: 'medium', followUpJobTypes: ['content.blog-topic-suggestions', 'social.multi-platform-daily-posts'] },
    ];
  }

  private nextPhaseImplementationPlan(jobType: JobType): SeoAuditPayload['nextPhaseImplementationPlan'] {
    return {
      backendRequirements: [
        'Add paginated public APIs for fights, blogs, fighters, wrestlers, videos, and leaderboards.',
        'Expose sitemap data and SEO metadata storage/apply endpoints.',
        'Validate and apply approved swarm SEO artifacts only through backend routes.',
        'Provide page inventory snapshots to swarm for better audit accuracy.',
      ],
      frontendRequirements: [
        'Add dynamic metadata, canonical URLs, OpenGraph/Twitter cards, and JSON-LD to public pages.',
        'Create premium landing/detail/profile pages using FantasyMMAdness gradients and fighter/wrestler visuals.',
        'Optimize images, lazy-load lower sections, and code-split admin features away from public pages.',
        'Add pagination UI, skeleton states, internal links, FAQs, and related content sections.',
      ],
      swarmRequirements: [
        'Generate daily SEO/content/growth artifacts and preserve review-first safety mode.',
        'Accept backend page inventory snapshots and public performance snapshots when available.',
        'Continue producing implementation plans rather than directly changing live pages.',
      ],
      acceptanceChecks: [
        'Every public page has unique metadata and canonical URL.',
        'Sitemap and robots are generated from backend-approved public routes.',
        'Large public lists are paginated.',
        'Schema is present only where required verified fields exist.',
        'Generated SEO recommendations are visible for admin review before apply.',
      ],
    };
  }

  private applicationPlanFor(jobType: JobType): SeoAuditPayload['applicationPlan'] {
    const action = jobType.includes('sitemap') || jobType.includes('robots')
      ? 'queue_sitemap_robots_update_after_backend_validation'
      : jobType.includes('schema')
        ? 'apply_schema_markup_after_admin_approval'
        : jobType.includes('link') || jobType.includes('footer')
          ? 'apply_internal_link_suggestions_after_admin_approval'
          : jobType.includes('pagination')
            ? 'create_backend_frontend_pagination_tasks_from_report'
            : jobType.includes('performance') || jobType.includes('vitals') || jobType.includes('image')
              ? 'create_frontend_performance_tasks_from_report'
              : 'patch_page_seo_fields_after_admin_approval';
    return {
      managedBySwarm: true,
      requiresBackendApply: true,
      safeToAutoApply: false,
      targetFields: ['metaTitle', 'metaDescription', 'canonicalUrl', 'openGraph', 'twitterCard', 'schemaMarkup', 'internalLinks', 'sitemap', 'robots', 'paginationPlan', 'performancePlan'],
      backendAction: action,
      notes: [
        'The swarm generates SEO packages, issue reports, and implementation instructions.',
        'The backend/frontend must approve and apply changes to website pages.',
        'This prevents automated SEO changes from silently modifying live content.',
      ],
    };
  }

  private defaultSchema(job: SwarmJobDocument, pageTitle: string, targetKeyword: string): Record<string, unknown> {
    const type = job.jobType.includes('faq') ? 'FAQPage' : job.jobType.includes('event') || job.jobType.includes('fight') ? 'SportsEvent' : job.jobType.includes('profile') ? 'Person' : 'Article';
    return {
      '@context': 'https://schema.org',
      '@type': type,
      headline: pageTitle,
      about: targetKeyword,
      publisher: { '@type': 'Organization', name: 'FantasyMMAdness' },
    };
  }

  private defaultInternalLinks(job: SwarmJobDocument, sport: string): SeoAuditPayload['internalLinkSuggestions'] {
    const sportPath = sport === 'boxing' ? '/boxing' : sport === 'pro_wrestling' || job.vertical === 'pro_wrestling' ? '/pro-wrestling' : '/fantasy-mma';
    return [
      { anchor: 'Active fights', targetPath: '/upcomingfights', reason: 'Moves SEO traffic toward current gameplay opportunities.' },
      { anchor: 'Fight calendar', targetPath: '/fight-calendar', reason: 'Supports freshness and discovery for upcoming contests.' },
      { anchor: 'How to play', targetPath: '/guides', reason: 'Helps new visitors understand the product quickly.' },
      { anchor: 'Fantasy fight blogs', targetPath: '/blogs', reason: 'Supports content discovery and crawl depth.' },
      { anchor: sport === 'boxing' ? 'Fantasy Boxing' : job.vertical === 'pro_wrestling' ? 'Fantasy Pro Wrestling' : 'Fantasy MMA', targetPath: sportPath, reason: 'Connects sport intent to a dedicated landing page.' },
    ];
  }

  private extractPageInventory(input: Record<string, unknown>): Record<string, unknown>[] {
    const value = input.pageInventory || input.pages || input.urls;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
  }
}
