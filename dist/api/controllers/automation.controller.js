import { z } from 'zod';
import { bulkUpdateAutomationSettings, getAutomation, getAutomationDashboard, listAutomationLogs, listAutomations, resetAutomationSetting, triggerAutomationEvent, updateAutomationSetting, } from '../../services/automation.service.js';
const listAutomationQuerySchema = z.object({
    trigger: z.string().optional(),
    category: z.string().optional(),
    vertical: z.string().optional(),
});
const updateSettingBodySchema = z.object({
    enabled: z.boolean().optional(),
    mode: z.enum(['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED']).optional(),
    approvalRequired: z.boolean().optional(),
    autoPublishAllowed: z.boolean().optional(),
    socialPublishAllowed: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
    updatedBy: z.record(z.unknown()).optional(),
});
const bulkUpdateBodySchema = z.object({
    items: z.array(z.object({
        key: z.string().min(1),
        enabled: z.boolean().optional(),
        mode: z.enum(['DRY_RUN', 'SHADOW', 'DRAFT_ONLY', 'APPROVAL_REQUIRED', 'AUTOMATED']).optional(),
        approvalRequired: z.boolean().optional(),
        autoPublishAllowed: z.boolean().optional(),
        socialPublishAllowed: z.boolean().optional(),
        config: z.record(z.unknown()).optional(),
        updatedBy: z.record(z.unknown()).optional(),
    })).min(1).max(100),
});
const triggerBodySchema = z.object({
    trigger: z.string().min(1),
    vertical: z.enum(['combat', 'pro_wrestling']).optional(),
    sourceEntity: z.object({
        type: z.string().min(1),
        id: z.string().optional(),
        label: z.string().optional(),
        url: z.string().url().optional(),
    }).passthrough().optional(),
    input: z.record(z.unknown()).default({}),
    requestedBy: z.record(z.unknown()).default({ source: 'backend' }),
    callbackUrl: z.string().url().optional(),
    dryRun: z.boolean().default(false),
    force: z.boolean().default(false),
    metadata: z.record(z.unknown()).default({}),
});
const logsQuerySchema = z.object({
    key: z.string().optional(),
    trigger: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
export async function listAutomationsHandler(req, res) {
    const query = listAutomationQuerySchema.parse(req.query);
    const items = await listAutomations(query);
    res.json({ ok: true, items, requestId: req.requestId });
}
export async function getAutomationHandler(req, res) {
    const item = await getAutomation(req.params.key);
    res.json({ ok: true, item, requestId: req.requestId });
}
export async function updateAutomationSettingHandler(req, res) {
    const body = updateSettingBodySchema.parse(req.body || {});
    const item = await updateAutomationSetting(req.params.key, body);
    res.json({ ok: true, item, requestId: req.requestId });
}
export async function bulkUpdateAutomationSettingsHandler(req, res) {
    const body = bulkUpdateBodySchema.parse(req.body || {});
    const items = await bulkUpdateAutomationSettings(body.items);
    res.json({ ok: true, items, requestId: req.requestId });
}
export async function resetAutomationSettingHandler(req, res) {
    const actor = typeof req.body?.actor === 'object' ? req.body.actor : undefined;
    const item = await resetAutomationSetting(req.params.key, actor);
    res.json({ ok: true, item, requestId: req.requestId });
}
export async function triggerAutomationEventHandler(req, res) {
    const body = triggerBodySchema.parse(req.body || {});
    const result = await triggerAutomationEvent(body);
    res.status(body.dryRun ? 200 : 202).json({ ok: true, result, requestId: req.requestId });
}
export async function automationDashboardHandler(req, res) {
    const dashboard = await getAutomationDashboard();
    res.json({ ok: true, dashboard, requestId: req.requestId });
}
export async function listAutomationLogsHandler(req, res) {
    const query = logsQuerySchema.parse(req.query);
    const items = await listAutomationLogs(query);
    res.json({ ok: true, items, requestId: req.requestId });
}
