# Phase 1 Campaign Automation Update

This update prepares the swarm for the end-user requested workflow: one fight or match can trigger multiple agents at once.

## Added

- Campaign API: `/internal/v1/campaigns`
- Campaign pack API: `/internal/v1/campaigns/packs`
- Campaign status API: `/internal/v1/campaigns/:campaignId`
- First-class Boxing campaign support through `sport: "boxing"`
- Grouped job creation under one `campaignId`
- Section-based selection for content, SEO, social, media, analytics, notifications, data, and admin automations
- `includeAll` support for “All Agents / All the Above” UI
- Campaign-aware job metadata
- Campaign summaries in the automation dashboard
- SEO artifacts now include an explicit `applicationPlan` explaining that swarm generates SEO packages and backend/frontend apply them after approval

## Safe behavior

- The swarm still does not directly modify website pages, wallets, contests, predictions, payouts, or settlements.
- Social outputs are still draft/approval-first unless later backend/frontend settings allow publishing.
- High-risk automations are downgraded from `AUTOMATED` to `APPROVAL_REQUIRED` unless forced by backend logic.

## Example campaign payload

```json
{
  "campaignType": "boxing_fight_campaign",
  "title": "Tonight Boxing Fight Promo",
  "vertical": "combat",
  "sport": "boxing",
  "mode": "APPROVAL_REQUIRED",
  "includeAll": true,
  "sourceEntity": {
    "type": "boxing_fight",
    "id": "fight_id_here",
    "label": "Tonight Boxing Fight"
  },
  "input": {
    "topic": "Promote tonight's free boxing fight contest",
    "platforms": ["x"]
  }
}
```

## Backend Phase 2 should expose this as

- Promote Tonight
- Run Full Campaign
- Boxing Campaign
- Blog Promotion Campaign
- Contest Promotion Campaign

## Frontend Phase 3 should show

- visible campaign progress
- latest jobs under the campaign
- generated outputs grouped by content, SEO, social, media, and notifications
