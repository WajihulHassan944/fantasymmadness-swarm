import { z } from 'zod';
import { AUTOMATION_DEFINITIONS, automationByKey, automationsByTrigger } from '../automations/definitions.js';
import { swarmModeSchema, verticalSchema } from '../contracts/domain.js';
import { AutomationLog } from '../models/automation-log.model.js';
import { AutomationSetting } from '../models/automation-setting.model.js';
import { createJob } from './job.service.js';
import { AppError } from '../utils/errors.js';
import { isoDateKey } from '../utils/time.js';
const updateAutomationSettingSchema = z.object({
    enabled: z.boolean().optional(),
    mode: swarmModeSchema.optional(),
    approvalRequired: z.boolean().optional(),
    autoPublishAllowed: z.boolean().optional(),
    socialPublishAllowed: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
    updatedBy: z.record(z.unknown()).optional(),
});
const triggerAutomationEventSchema = z.object({
    trigger: z.string().min(1),
    vertical: verticalSchema.optional(),
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
function defaultSetting(definition) {
    return {
        key: definition.key,
        enabled: definition.enabledByDefault,
        mode: definition.defaultMode,
        approvalRequired: definition.requiresApproval,
        autoPublishAllowed: false,
        socialPublishAllowed: false,
        config: {},
    };
}
function mergeSetting(definition, stored) {
    const base = defaultSetting(definition);
    if (!stored)
        return base;
    return {
        key: definition.key,
        enabled: stored.enabled,
        mode: stored.mode,
        approvalRequired: stored.approvalRequired,
        autoPublishAllowed: stored.autoPublishAllowed,
        socialPublishAllowed: stored.socialPublishAllowed,
        config: stored.config || {},
        updatedAt: stored.updatedAt,
    };
}
function sanitizeMode(definition, requestedMode) {
    if (requestedMode === 'AUTOMATED' && !definition.supportsAutoMode)
        return definition.defaultMode;
    return requestedMode;
}
export async function listAutomations(query = {}) {
    const keys = AUTOMATION_DEFINITIONS.map((definition) => definition.key);
    const stored = await AutomationSetting.find({ key: { $in: keys } });
    const byKey = new Map(stored.map((setting) => [setting.key, setting]));
    return AUTOMATION_DEFINITIONS
        .filter((definition) => !query.trigger || definition.trigger === query.trigger)
        .filter((definition) => !query.category || definition.category === query.category)
        .filter((definition) => !query.vertical || definition.vertical === query.vertical || definition.vertical === 'both')
        .map((definition) => ({ ...definition, setting: mergeSetting(definition, byKey.get(definition.key)) }));
}
export async function getAutomation(key) {
    const definition = automationByKey(key);
    if (!definition)
        throw new AppError(404, 'AUTOMATION_NOT_FOUND', `Automation ${key} was not found.`);
    const stored = await AutomationSetting.findOne({ key });
    return { ...definition, setting: mergeSetting(definition, stored) };
}
export async function updateAutomationSetting(key, rawInput) {
    const definition = automationByKey(key);
    if (!definition)
        throw new AppError(404, 'AUTOMATION_NOT_FOUND', `Automation ${key} was not found.`);
    const input = updateAutomationSettingSchema.parse(rawInput);
    const existing = await AutomationSetting.findOne({ key });
    const base = existing || defaultSetting(definition);
    const mode = sanitizeMode(definition, input.mode || base.mode);
    const update = {
        enabled: input.enabled ?? base.enabled,
        mode,
        approvalRequired: input.approvalRequired ?? base.approvalRequired,
        autoPublishAllowed: input.autoPublishAllowed ?? base.autoPublishAllowed,
        socialPublishAllowed: input.socialPublishAllowed ?? base.socialPublishAllowed,
        config: input.config ?? base.config,
        updatedBy: input.updatedBy,
    };
    await AutomationSetting.updateOne({ key }, { $set: update }, { upsert: true });
    await AutomationLog.create({
        key,
        action: 'setting.updated',
        status: 'succeeded',
        message: `Automation setting updated: ${key}`,
        createdJobs: [],
        details: update,
        actor: input.updatedBy,
    });
    return getAutomation(key);
}
export async function bulkUpdateAutomationSettings(items) {
    const updated = [];
    for (const item of items) {
        updated.push(await updateAutomationSetting(item.key, item));
    }
    return updated;
}
export async function resetAutomationSetting(key, actor) {
    const definition = automationByKey(key);
    if (!definition)
        throw new AppError(404, 'AUTOMATION_NOT_FOUND', `Automation ${key} was not found.`);
    await AutomationSetting.deleteOne({ key });
    await AutomationLog.create({
        key,
        action: 'setting.reset',
        status: 'succeeded',
        message: `Automation setting reset to defaults: ${key}`,
        createdJobs: [],
        details: defaultSetting(definition),
        actor,
    });
    return getAutomation(key);
}
export async function getAutomationDashboard() {
    const automations = await listAutomations();
    const enabled = automations.filter((item) => item.setting.enabled);
    const byCategory = automations.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});
    const enabledByCategory = enabled.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});
    const recentLogs = await AutomationLog.find({}).sort({ createdAt: -1 }).limit(20);
    return {
        totals: {
            automations: automations.length,
            enabled: enabled.length,
            disabled: automations.length - enabled.length,
            approvalRequired: automations.filter((item) => item.setting.approvalRequired).length,
            supportsAutoMode: automations.filter((item) => item.supportsAutoMode).length,
        },
        byCategory,
        enabledByCategory,
        groups: [...new Set(automations.map((item) => item.adminGroup))].sort(),
        recentLogs: recentLogs.map((log) => ({
            logId: log.logId,
            key: log.key,
            trigger: log.trigger,
            action: log.action,
            status: log.status,
            message: log.message,
            createdJobs: log.createdJobs,
            details: log.details,
            actor: log.actor,
            createdAt: log.createdAt,
        })),
    };
}
export async function triggerAutomationEvent(rawInput) {
    const input = triggerAutomationEventSchema.parse(rawInput);
    const definitions = automationsByTrigger(input.trigger).filter((definition) => {
        if (!input.vertical)
            return true;
        return definition.vertical === input.vertical || definition.vertical === 'both';
    });
    if (!definitions.length) {
        const log = await AutomationLog.create({
            trigger: input.trigger,
            action: 'event.triggered',
            status: 'skipped',
            message: `No automations match trigger ${input.trigger}.`,
            createdJobs: [],
            details: input,
            actor: input.requestedBy,
        });
        return { trigger: input.trigger, matched: 0, created: 0, skipped: 0, jobs: [], logId: log.logId };
    }
    const automations = await listAutomations({ trigger: input.trigger, vertical: input.vertical });
    const jobs = [];
    const skipped = [];
    const dateKey = isoDateKey(new Date());
    for (const automation of automations) {
        const enabled = input.force || automation.setting.enabled;
        if (!enabled) {
            skipped.push({ key: automation.key, reason: 'disabled' });
            continue;
        }
        const vertical = automation.vertical === 'both'
            ? input.vertical || inferVerticalFromTrigger(input.trigger)
            : automation.vertical;
        const sourceEntity = input.sourceEntity || {
            type: 'automation_event',
            label: input.trigger,
        };
        const idempotencySource = sourceEntity.id || sourceEntity.label || JSON.stringify(sourceEntity);
        const idempotencyKey = `automation:${dateKey}:${automation.key}:${String(idempotencySource).slice(0, 80)}`;
        if (input.dryRun) {
            jobs.push({
                dryRun: true,
                automationKey: automation.key,
                vertical,
                jobType: automation.jobType,
                mode: automation.setting.mode,
                idempotencyKey,
            });
            continue;
        }
        const result = await createJob({
            vertical,
            jobType: automation.jobType,
            mode: automation.setting.mode,
            priority: riskPriority(automation.riskLevel),
            idempotencyKey,
            requestedBy: { ...input.requestedBy, source: String(input.requestedBy.source || 'backend') },
            sourceEntity,
            input: {
                ...input.input,
                automationKey: automation.key,
                automationLabel: automation.label,
                automationTrigger: input.trigger,
                automationCategory: automation.category,
                targetOutput: automation.output,
                approvalRequired: automation.setting.approvalRequired,
                config: automation.setting.config,
            },
            callbackUrl: input.callbackUrl,
            metadata: {
                ...input.metadata,
                automation: true,
                automationKey: automation.key,
                trigger: input.trigger,
                adminGroup: automation.adminGroup,
            },
        });
        jobs.push({
            automationKey: automation.key,
            created: result.created,
            jobId: result.job.jobId,
            jobType: result.job.jobType,
            vertical: result.job.vertical,
            status: result.job.status,
            idempotencyKey,
        });
    }
    const log = await AutomationLog.create({
        trigger: input.trigger,
        action: 'event.triggered',
        status: jobs.length ? 'succeeded' : 'skipped',
        message: `Automation trigger processed: ${input.trigger}`,
        createdJobs: jobs.map((job) => String(job.jobId || '')).filter(Boolean),
        details: { matched: automations.length, skipped, dryRun: input.dryRun, input },
        actor: input.requestedBy,
    });
    return {
        trigger: input.trigger,
        matched: automations.length,
        created: jobs.filter((job) => !job.dryRun).length,
        skipped: skipped.length,
        jobs,
        skippedItems: skipped,
        logId: log.logId,
    };
}
export async function listAutomationLogs(query = {}) {
    const filter = {};
    if (query.key)
        filter.key = query.key;
    if (query.trigger)
        filter.trigger = query.trigger;
    const limit = Math.max(1, Math.min(100, Number(query.limit || 50)));
    const logs = await AutomationLog.find(filter).sort({ createdAt: -1 }).limit(limit);
    return logs.map((log) => ({
        logId: log.logId,
        key: log.key,
        trigger: log.trigger,
        action: log.action,
        status: log.status,
        message: log.message,
        createdJobs: log.createdJobs,
        details: log.details,
        actor: log.actor,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
    }));
}
function inferVerticalFromTrigger(trigger) {
    if (trigger.includes('wrestl'))
        return 'pro_wrestling';
    return 'combat';
}
function riskPriority(risk) {
    if (risk === 'high')
        return 70;
    if (risk === 'medium')
        return 55;
    return 35;
}
