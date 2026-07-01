import { describe, expect, it } from 'vitest';
import { createCampaignSchema } from '../src/contracts/campaign.js';
import { listCampaignPacks } from '../src/services/campaign.service.js';

describe('campaign automation contract', () => {
  it('accepts a boxing all-agents campaign', () => {
    const parsed = createCampaignSchema.parse({
      campaignType: 'boxing_fight_campaign',
      vertical: 'combat',
      sport: 'boxing',
      includeAll: true,
      sourceEntity: { type: 'boxing_fight', label: 'Tonight Boxing Fight' },
      input: { topic: 'Promote tonight boxing fight' },
    });

    expect(parsed.campaignType).toBe('boxing_fight_campaign');
    expect(parsed.sport).toBe('boxing');
    expect(parsed.includeAll).toBe(true);
    expect(parsed.mode).toBe('APPROVAL_REQUIRED');
  });

  it('exposes campaign packs for backend/frontend controls', () => {
    const packs = listCampaignPacks();
    expect(packs.some((pack) => pack.campaignType === 'fight_full_campaign')).toBe(true);
    expect(packs.some((pack) => pack.campaignType === 'fight_tonight_campaign')).toBe(true);
    expect(packs.some((pack) => pack.campaignType === 'boxing_fight_campaign')).toBe(true);
    expect(packs.some((pack) => pack.campaignType === 'july_10000_signup_growth_system')).toBe(true);
  });

  it('accepts July 10000 signup growth campaign', () => {
    const parsed = createCampaignSchema.parse({
      campaignType: 'july_10000_signup_growth_system',
      vertical: 'combat',
      sport: 'combat',
      includeAll: true,
      sourceEntity: { type: 'growth_campaign', label: 'July Signup Push' },
      input: { topic: 'July 10000 signup growth system' },
    });

    expect(parsed.campaignType).toBe('july_10000_signup_growth_system');
    expect(parsed.includeAll).toBe(true);
    expect(parsed.mode).toBe('APPROVAL_REQUIRED');
  });
});
