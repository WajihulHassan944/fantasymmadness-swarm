import { createCampaignSchema } from '../../contracts/campaign.js';
import { createCampaign, getCampaign, listCampaignPacks, listCampaigns, serializeCampaign } from '../../services/campaign.service.js';
export async function listCampaignPacksHandler(req, res) {
    res.json({ ok: true, items: listCampaignPacks(), requestId: req.requestId });
}
export async function createCampaignHandler(req, res) {
    const parsed = createCampaignSchema.parse(req.body || {});
    const result = await createCampaign(parsed);
    res.status(202).json({
        ok: true,
        campaign: serializeCampaign(result.campaign),
        jobs: result.jobs,
        skipped: result.skipped,
        requestId: req.requestId,
    });
}
export async function listCampaignsHandler(req, res) {
    const result = await listCampaigns(req.query);
    res.json({
        ok: true,
        items: result.items.map(serializeCampaign),
        pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: Math.ceil(result.total / result.limit),
        },
        requestId: req.requestId,
    });
}
export async function getCampaignHandler(req, res) {
    const campaign = await getCampaign(req.params.campaignId);
    res.json({ ok: true, campaign: serializeCampaign(campaign), requestId: req.requestId });
}
